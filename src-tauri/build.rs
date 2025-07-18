fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .plugin(
                "proxy-plugin",
                tauri_build::InlinedPlugin::new().commands(&["get_proxy_url", "get_proxy_port"]),
            )
            .plugin(
                "androidfs-plugin",
                tauri_build::InlinedPlugin::new().commands(&["save_file"]),
            ),
    )
    .expect("failed to run tauri-build");
}
