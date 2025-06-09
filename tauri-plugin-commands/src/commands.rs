use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::CommandsExt;
use crate::Result;

#[command]
pub(crate) async fn exit_app<R: Runtime>(
    app: AppHandle<R>,
    payload: EmptyRequest,
) -> Result<EmptyResponse> {
    app.commands().exit_app(payload)
}

#[command]
pub(crate) async fn save_image_to_pictures<R: Runtime>(
    app: AppHandle<R>,
    payload: SaveImageRequest,
) -> Result<UriResponse> {
    app.commands().save_image_to_pictures(payload)
}

#[command]
pub(crate) async fn save_file_to_downloads<R: Runtime>(
    app: AppHandle<R>,
    payload: SaveFileRequest,
) -> Result<UriResponse> {
    app.commands().save_file_to_downloads(payload)
}
