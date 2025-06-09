// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

//! Access the HTTP client written in Rust.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};
mod commands;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R>::new("androidfs-plugin")
        .invoke_handler(tauri::generate_handler![commands::save_file,])
        .build()
}
