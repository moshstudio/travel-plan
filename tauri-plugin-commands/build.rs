const COMMANDS: &[&str] = &[
    "exit_app",
    "save_image_to_pictures",
    "save_file_to_downloads",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
