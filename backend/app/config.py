import json
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    vault_path: str = "/Users/agent/obsidian/hyundo32"
    basic_auth_user: str = "admin"
    basic_auth_pass: str = "changeme"
    allowed_origins: str = "http://localhost:3000"
    hermes_api_url: str = "http://localhost:8642"
    hermes_api_key: str = ""

    class Config:
        env_file = ".env"

    @property
    def origins_list(self):
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()

# config/settings.json 파일이 존재하면 설정을 오버라이드합니다.
config_path = Path(__file__).resolve().parent.parent.parent / "config" / "settings.json"
if config_path.exists():
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = json.load(f)
            for key, val in config_data.items():
                if hasattr(settings, key) and val is not None:
                    setattr(settings, key, val)
    except Exception as e:
        print(f"Warning: Failed to load config/settings.json: {e}")

