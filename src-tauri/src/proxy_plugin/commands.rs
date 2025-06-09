use reqwest;
use reqwest::header::HeaderMap as ReqwestHeaderMap;
use reqwest::Method as ReqwestMethod;
use std::net::TcpListener;
use std::string::ToString;
use std::sync::atomic::{AtomicU16, Ordering};
use std::time::Duration;
use urlencoding::encode;
use warp::http::header::{HeaderMap as WarpHeaderMap, HeaderName};
use warp::http::HeaderValue;
use warp::http::Method as WarpMethod;
use warp::reply::Reply;
use warp::{self, Filter};

const HOST: &str = "http://127.0.0.1";
// Store actual port and request data
static ACTUAL_PORT: AtomicU16 = AtomicU16::new(0);

fn convert_to_reqwest_method(warp_method: WarpMethod) -> ReqwestMethod {
    match warp_method {
        WarpMethod::GET => ReqwestMethod::GET,
        WarpMethod::POST => ReqwestMethod::POST,
        WarpMethod::PUT => ReqwestMethod::PUT,
        WarpMethod::DELETE => ReqwestMethod::DELETE,
        // 其他方法...
        _ => ReqwestMethod::from_bytes(warp_method.as_str().as_bytes()).unwrap(),
    }
}
fn convert_to_reqwest_headers(warp_headers: &WarpHeaderMap) -> ReqwestHeaderMap {
    let cloned_headers = warp_headers.clone();
    let mut reqwest_headers = ReqwestHeaderMap::new();
    for (name, value) in cloned_headers.iter() {
        // 使用 reqwest::HeaderValue::from_bytes 显式创建值
        let header_value = reqwest::header::HeaderValue::from_bytes(value.as_bytes())
            .expect("Failed to convert header value");
        reqwest_headers.insert(
            reqwest::header::HeaderName::from_bytes(name.as_str().as_bytes())
                .expect("Failed to convert header name"),
            header_value,
        );
    }
    reqwest_headers
}
fn convert_to_wrap_headers(reqwest_headers: ReqwestHeaderMap) -> WarpHeaderMap {
    let mut warp_headers = WarpHeaderMap::new();
    for (name, value) in reqwest_headers.iter() {
        let name = HeaderName::from_bytes(name.as_str().as_bytes()).unwrap();
        let value = HeaderValue::from_bytes(value.as_bytes()).unwrap();
        warp_headers.insert(name, value);
    }
    warp_headers
}

async fn handle_proxy_request(
    headers_part: &str,
    encoded_url: &str,
    params: Option<String>,
    method: warp::http::Method,
    headers: warp::http::HeaderMap,
    body: warp::hyper::body::Bytes,
) -> Result<impl warp::Reply, warp::Rejection> {
    // 解码URL
    let url = match urlencoding::decode(encoded_url) {
        Ok(decoded) => decoded,
        Err(_) => {
            let reply = warp::reply::with_status(
                "Invalid URL encoding".to_string(),
                warp::http::StatusCode::BAD_REQUEST,
            );
            return Ok(reply.into_response());
        }
    };
    // 解析目标URI
    let uri: warp::http::Uri = match url.parse() {
        Ok(u) => u,
        Err(_) => {
            let reply = warp::reply::with_status(
                "Invalid target URL".to_string(),
                warp::http::StatusCode::BAD_REQUEST,
            );
            return Ok(reply.into_response());
        }
    };
    let uri = if let Some(params) = params {
        format!("{}?{}", uri.to_string(), params)
    } else {
        uri.to_string()
    };
    // 解码headers
    let decoded_headers = urlencoding::decode(headers_part).unwrap_or_default();
    let mut header_map = reqwest::header::HeaderMap::new();
    if !decoded_headers.is_empty() {
        for header_pair in decoded_headers.split(',') {
            if let Some((name_part, value_part)) = header_pair.split_once(':') {
                if let Ok(header_name) = name_part.parse::<http::header::HeaderName>() {
                    if let Ok(header_value) = http::HeaderValue::from_str(value_part) {
                        header_map.insert(header_name, header_value);
                    }
                }
            }
        }
    }
    let reqwest_headers = convert_to_reqwest_headers(&headers);
    let excluded_headers: [reqwest::header::HeaderName; 3] = [
        reqwest::header::HeaderName::from_static("host"),
        reqwest::header::HeaderName::from_static("referer"),
        reqwest::header::HeaderName::from_static("origin"),
    ];
    // 遍历源 headers
    for (name, value) in reqwest_headers.iter() {
        // 检查头部是否不在排除列表中且不在目标 header_map 中
        if !excluded_headers.contains(&name) && !header_map.contains_key(name) {
            // 由于 HeaderValue 是不可变的，我们可以直接克隆它
            header_map.insert(name.clone(), value.clone());
        }
    }

    // 创建HTTP客户端
    let client = get_default_http_client();

    // 构建请求
    let reqwest_request = match client
        .request(convert_to_reqwest_method(method), uri)
        .headers(header_map)
        .body(body)
        .build()
    {
        Ok(req) => req,
        Err(_) => {
            let reply = warp::reply::with_status(
                "Failed to build request".to_string(),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            );
            return Ok(reply.into_response());
        }
    };

    let response = match client.execute(reqwest_request).await {
        Ok(res) => res,
        Err(e) => {
            let reply = warp::reply::with_status(
                format!("Request failed: {}", e),
                warp::http::StatusCode::BAD_GATEWAY,
            );
            return Ok(reply.into_response());
        }
    };
    // 转换响应状态码
    let status = warp::http::StatusCode::from_u16(response.status().as_u16())
        .unwrap_or(warp::http::StatusCode::INTERNAL_SERVER_ERROR);

    // 转换响应头（过滤掉非法头）
    let mut headers = warp::http::HeaderMap::new();
    for (key, value) in response.headers() {
        if let Ok(name) = warp::http::HeaderName::from_bytes(key.as_ref()) {
            if let Ok(val) = warp::http::HeaderValue::from_bytes(value.as_bytes()) {
                headers.insert(name, val);
            }
        }
    }

    // 移除可能冲突的头部
    headers.remove(warp::http::header::CONNECTION);

    // 转换响应体为流
    let stream = response.bytes_stream();

    // 构建响应
    let mut reply = warp::http::Response::new(warp::hyper::Body::wrap_stream(stream));
    *reply.status_mut() = status;
    *reply.headers_mut() = headers;

    Ok(reply)
}

fn get_default_http_client() -> reqwest::Client {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::HeaderName::from_static("user-agent"),
        reqwest::header::HeaderValue::from_static(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        ),
    );
    headers.insert(
        reqwest::header::HeaderName::from_static("upgrade-insecure-requests"),
        reqwest::header::HeaderValue::from_static("1"),
    );
    return reqwest::Client::builder()
        .use_rustls_tls()
        .default_headers(headers)
        .redirect(reqwest::redirect::Policy::none())
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .connect_timeout(Duration::from_secs(15))
        .build()
        .unwrap();
}

#[tauri::command]
pub(crate) fn get_proxy_url(
    url: &str,
    headers: Option<Vec<(String, String)>>,
) -> Result<String, String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);

    let encoded_url = encode(url);

    let mut headers_part = if let Some(h) = headers {
        let mut headers_str = String::new();
        for (name, value) in h.iter() {
            headers_str.push_str(&format!("{}:{},", name.as_str(), value));
        }
        // 移除最后的逗号
        if !headers_str.is_empty() {
            headers_str.pop();
        }
        encode(&headers_str).into_owned()
    } else {
        encode("").into_owned()
    };
    if headers_part.is_empty() {
        headers_part = encode("_").into_owned();
    }

    Ok(format!(
        "{}:{}/proxy/{}/{}",
        HOST, port, headers_part, encoded_url
    ))
}

#[tauri::command]
pub(crate) fn get_proxy_port() -> Result<u16, u16> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);
    Ok(port)
}

fn find_available_port(start_port: u16) -> Option<u16> {
    (start_port..=start_port + 100).find(|port| TcpListener::bind(("127.0.0.1", *port)).is_ok())
}

pub(crate) fn start_proxy_server() -> std::io::Result<()> {
    let port = find_available_port(1430).ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::AddrInUse, "No available port found")
    })?;

    ACTUAL_PORT.store(port, Ordering::SeqCst);

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);

    let proxy = warp::path!("proxy" / String / String)
        .and(
            warp::query::raw()
                .map(Some)
                .or(warp::any().map(|| None))
                .unify(),
        ) // 获取可选的查询参数
        .and(warp::method()) // 获取 HTTP 方法
        .and(warp::header::headers_cloned()) // 获取请求头
        .and(warp::body::bytes()) // 获取请求体
        .and_then(
            |headers_part: String,
             encoded_url: String,
             params: Option<String>,
             method: warp::http::Method,
             headers: warp::http::HeaderMap,
             body: warp::hyper::body::Bytes| async move {
                handle_proxy_request(&headers_part, &encoded_url, params, method, headers, body)
                    .await
            },
        );

    let routers = proxy.with(cors);

    tauri::async_runtime::spawn(warp::serve(routers).run(([127, 0, 0, 1], port)));

    Ok(())
}
