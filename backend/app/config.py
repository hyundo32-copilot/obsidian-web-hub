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
