use std::fmt;
use tauri::{command, AppHandle, Runtime};
use tauri_plugin_android_fs::{
    AndroidFsExt, Error, PublicAudioDir, PublicDir, PublicGeneralPurposeDir, PublicImageDir,
    PublicVideoDir,
};

// 自定义错误类型
#[derive(Debug)]
enum DirectoryError {
    InvalidDirectoryType,
    InvalidSubdirectoryType,
}

impl std::error::Error for DirectoryError {}

impl fmt::Display for DirectoryError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            DirectoryError::InvalidDirectoryType => write!(f, "Invalid public directory type"),
            DirectoryError::InvalidSubdirectoryType => write!(f, "Invalid subdirectory type"),
        }
    }
}

#[command]
pub(crate) fn save_file<R: Runtime>(
    app: AppHandle<R>,
    file_type: String,
    sub_type: Option<String>,
    file_name: String,
    mime_type: String,
    contents: Vec<u8>,
) -> Result<(), Error> {
    let api = app.android_fs();
    let storage = api.public_storage();

    let public_dir = match file_type.to_lowercase().as_str() {
        "image" => {
            let image_sub = sub_type.as_deref().unwrap_or("pictures");
            match image_sub.to_lowercase().as_str() {
                "pictures" => PublicDir::Image(PublicImageDir::Pictures),
                "dcim" => PublicDir::Image(PublicImageDir::DCIM),
                _ => {
                    return Err(Error::from(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        DirectoryError::InvalidSubdirectoryType,
                    )))
                }
            }
        }
        "video" => {
            let video_sub = sub_type.as_deref().unwrap_or("movies");
            match video_sub.to_lowercase().as_str() {
                "movies" => PublicDir::Video(PublicVideoDir::Movies),
                "dcim" => PublicDir::Video(PublicVideoDir::DCIM),
                _ => {
                    return Err(Error::from(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        DirectoryError::InvalidSubdirectoryType,
                    )))
                }
            }
        }
        "audio" => {
            let audio_sub = sub_type.as_deref().unwrap_or("music");
            match audio_sub.to_lowercase().as_str() {
                "music" => PublicDir::Audio(PublicAudioDir::Music),
                "alarms" => PublicDir::Audio(PublicAudioDir::Alarms),
                "audiobooks" => PublicDir::Audio(PublicAudioDir::Audiobooks),
                "notifications" => PublicDir::Audio(PublicAudioDir::Notifications),
                "podcasts" => PublicDir::Audio(PublicAudioDir::Podcasts),
                "ringtones" => PublicDir::Audio(PublicAudioDir::Ringtones),
                "recordings" => PublicDir::Audio(PublicAudioDir::Recordings),
                _ => {
                    return Err(Error::from(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        DirectoryError::InvalidSubdirectoryType,
                    )))
                }
            }
        }
        "general_purpose" => {
            let gp_sub = sub_type.as_deref().unwrap_or("documents");
            match gp_sub.to_lowercase().as_str() {
                "documents" => PublicDir::GeneralPurpose(PublicGeneralPurposeDir::Documents),
                "download" => PublicDir::GeneralPurpose(PublicGeneralPurposeDir::Download),
                _ => {
                    return Err(Error::from(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        DirectoryError::InvalidSubdirectoryType,
                    )))
                }
            }
        }
        _ => {
            return Err(Error::from(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                DirectoryError::InvalidDirectoryType,
            )))
        }
    };

    let uri = storage.create_file_in_public_app_dir(public_dir, file_name, Some(&mime_type))?;

    api.write(&uri, contents)?;
    Ok(())
}
