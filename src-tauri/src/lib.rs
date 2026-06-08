use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                let window = app.get_webview_window("main")
                    .expect("no main window");
                window.navigate("https://lead-gamma-topaz.vercel.app".parse().unwrap())?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
