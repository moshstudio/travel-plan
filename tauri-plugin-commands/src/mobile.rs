use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_commands);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Commands<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("com.travel_plan.commands", "CommandsPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_commands)?;
    Ok(Commands(handle))
}

/// Access to the commands APIs.
pub struct Commands<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Commands<R> {
    pub fn exit_app(&self, payload: EmptyRequest) -> crate::Result<EmptyResponse> {
        self.0
            .run_mobile_plugin("exitApp", payload)
            .map_err(Into::into)
    }
    pub fn save_image_to_pictures(&self, payload: SaveImageRequest) -> crate::Result<UriResponse> {
        self.0
            .run_mobile_plugin("saveImageToPictures", payload)
            .map_err(Into::into)
    }
    pub fn save_file_to_downloads(&self, payload: SaveFileRequest) -> crate::Result<UriResponse> {
        self.0
            .run_mobile_plugin("saveFileToDownloads", payload)
            .map_err(Into::into)
    }
}
