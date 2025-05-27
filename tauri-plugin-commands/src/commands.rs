use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::CommandsExt;

#[command]
pub(crate) async fn exit_app<R: Runtime>(
    app: AppHandle<R>,
    payload: EmptyRequest,
) -> Result<EmptyResponse> {
    app.commands().exit_app(payload)
}
