# Skill Stair
An AI-Powered Speech and Text Mock Interview System with a Personalized Weekly Learning Roadmap.

React (Vite) + Spring Boot (JdbcTemplate, JWT, BCrypt) + MySQL + Python FastAPI (TF-IDF scoring, rule-based roadmap).

## Run order
1. **MySQL**: run `database/schema.sql` (creates the `skillstair` database, tables and a starter question bank).
2. **AI service**: `cd ai-service && pip install -r requirements.txt && uvicorn main:app --port 8000`
3. **Backend**: set your MySQL password in `backend/src/main/resources/application.properties`, then `cd backend && mvn spring-boot:run` (port 8080).
4. **Frontend**: `cd frontend && npm install && npm run dev`
5. Open **https://localhost:5173/SkillStair** (accept the self-signed certificate warning once). Use Chrome or Edge for speech recognition.

## URLs
| Page | URL |
|---|---|
| Landing | /SkillStair (also /SkillStair/home) |
| Login / Sign Up | /SkillStair/login, /SkillStair/signup |
| Dashboard | /SkillStair/dashboard |
| Start Interview | /SkillStair/start-interview |
| Live Interview | /SkillStair/interview/:id |
| Results | /SkillStair/results/:id |
| History | /SkillStair/history |
| Learning Path Generator | /SkillStair/learning-path |
| Weekly Roadmap | /SkillStair/roadmap |
| Progress Analytics | /SkillStair/analytics |
| Profile | /SkillStair/profile |

Scores are practice estimates from transcript text only. Pronunciation, tone and confidence are not measured.
