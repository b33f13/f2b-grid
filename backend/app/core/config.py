from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    f2b_db_path: str = "../data/fail2ban.sqlite3"
    f2b_log_path: str = "/app/logs/fail2ban.log"
    api_v1_str: str = "/api/v1"
    
    class Config:
        env_file = ".env"

settings = Settings()
