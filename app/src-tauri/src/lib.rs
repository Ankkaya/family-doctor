mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_stronghold::Builder::new(|password| {
            let config = argon2::Config {
                variant: argon2::Variant::Argon2id,
                version: argon2::Version::Version13,
                mem_cost: 19_456,
                time_cost: 2,
                lanes: 1,
                ..Default::default()
            };
            argon2::hash_raw(password.as_ref(), b"family-doctor-vault-v1", &config)
                .expect("failed to derive stronghold key")
        }).build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::hello_world,
            commands::exit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
