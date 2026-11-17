package com.skillstair;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder enc;
    private final RestTemplate rest = new RestTemplate();
    @Value("${skillstair.ai.url}") private String aiUrl;

    public ApiController(JdbcTemplate jdbc, PasswordEncoder enc) { this.jdbc = jdbc; this.enc = enc; }

    // ------------------------------------------------------------ helpers
    private long uid() { return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }

    private void own(long sid) {
        Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM interview_sessions WHERE id=? AND user_id=?", Integer.class, sid, uid());
        if (c == null || c == 0) throw new ApiException(404, "Interview not found.");
    }

    private static List<String> lines(Object s) {
        if (s == null) return List.of();
        return Arrays.stream(String.valueOf(s).split("\n")).map(String::trim).filter(x -> !x.isEmpty()).collect(Collectors.toList());
    }

    private static String join(Object l) {
        return l == null ? "" : ((List<?>) l).stream().map(String::valueOf).collect(Collectors.joining("\n"));
    }

    private static double num(Object o) { return ((Number) o).doubleValue(); }

    @SuppressWarnings("unchecked")
    private Map<String, Object> ai(String path, Object body) {
        try { return rest.postForObject(aiUrl + path, body, Map.class); }
        catch (Exception e) { throw new ApiException(503, "The AI service is not running. Start it with: uvicorn main:app --port 8000"); }
    }

    private Map<String, Object> activePath(long u) {
        List<Map<String, Object>> p = jdbc.queryForList(
                "SELECT id, goal, level, weeks, weekly_hours hours, focus, adjustment_note note FROM learning_paths WHERE user_id=? AND status='ACTIVE' ORDER BY id DESC LIMIT 1", u);
        if (p.isEmpty()) return null;
        Map<String, Object> path = new LinkedHashMap<>(p.get(0));
        path.put("tasks", jdbc.queryForList(
                "SELECT id, week_number week, week_title weekTitle, title, description, estimated_minutes minutes, resource_link resource, is_extra extra, completed FROM learning_tasks WHERE path_id=? ORDER BY week_number, id",
                path.get("id")));
        return path;
    }

    // ------------------------------------------------------------ dashboard
    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        long u = uid();
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("name", jdbc.queryForObject("SELECT name FROM users WHERE id=?", String.class, u));
        Map<String, Object> s = jdbc.queryForMap("SELECT COUNT(*) c, ROUND(AVG(overall_score)) a FROM interview_sessions WHERE user_id=? AND status='COMPLETED'", u);
        r.put("total", s.get("c"));
        r.put("average", s.get("a"));
        List<Map<String, Object>> recent = jdbc.queryForList(
                "SELECT id, role, DATE_FORMAT(created_at,'%d %b') date, overall_score score FROM interview_sessions WHERE user_id=? AND status='COMPLETED' ORDER BY created_at DESC, id DESC LIMIT 5", u);
        r.put("recent", recent);
        r.put("latest", recent.isEmpty() ? null : recent.get(0).get("score"));
        r.put("plan", activePath(u));
        return r;
    }

    // ------------------------------------------------------------ interviews
    @PostMapping("/interviews")
    public Map<String, Object> start(@RequestBody Map<String, Object> b) {
        String role = String.valueOf(b.get("role")), level = String.valueOf(b.get("level")), type = String.valueOf(b.get("type"));
        int count = Integer.parseInt(String.valueOf(b.get("count")));
        int beh = type.startsWith("Behavioral") ? count : type.startsWith("Mixed") ? count / 3 : 0;
        int tech = count - beh;
        List<Long> qs = new ArrayList<>();
        if (tech > 0) qs.addAll(jdbc.queryForList("SELECT id FROM questions WHERE role=? AND category='TECHNICAL' ORDER BY RAND() LIMIT ?", Long.class, role, tech));
        if (beh > 0) qs.addAll(jdbc.queryForList("SELECT id FROM questions WHERE category='BEHAVIORAL' ORDER BY RAND() LIMIT ?", Long.class, beh));
        if (qs.isEmpty()) throw new ApiException(400, "No questions are available for this selection yet.");
        long sid = new SimpleJdbcInsert(jdbc).withTableName("interview_sessions").usingGeneratedKeyColumns("id")
                .executeAndReturnKey(Map.of("user_id", uid(), "role", role, "level", level, "type", type, "question_count", qs.size())).longValue();
        for (int k = 0; k < qs.size(); k++)
            jdbc.update("INSERT INTO session_questions(session_id,question_id,`position`) VALUES(?,?,?)", sid, qs.get(k), k);
        return Map.of("id", sid);
    }

    @GetMapping("/interviews/{id}")
    public Map<String, Object> session(@PathVariable long id) {
        own(id);
        Map<String, Object> s = new LinkedHashMap<>(jdbc.queryForMap("SELECT id, role, level, type FROM interview_sessions WHERE id=?", id));
        s.put("questions", jdbc.queryForList(
                "SELECT q.id, q.question_text text, q.category, a.transcript FROM session_questions sq JOIN questions q ON q.id=sq.question_id " +
                "LEFT JOIN answers a ON a.session_id=sq.session_id AND a.question_id=q.id WHERE sq.session_id=? ORDER BY sq.`position`", id));
        return s;
    }

    @PostMapping("/interviews/{id}/answers")
    public Map<String, Object> answer(@PathVariable long id, @RequestBody Map<String, Object> b) {
        own(id);
        long qid = ((Number) b.get("questionId")).longValue();
        String text = String.valueOf(b.getOrDefault("transcript", "")).trim();
        String method = "speech".equals(b.get("inputMethod")) ? "speech" : "text";
        if (text.isEmpty() || text.split("\\s+").length < 8)
            throw new ApiException(400, "Please add more detail (at least a couple of sentences) before submitting.");
        Integer in = jdbc.queryForObject("SELECT COUNT(*) FROM session_questions WHERE session_id=? AND question_id=?", Integer.class, id, qid);
        if (in == null || in == 0) throw new ApiException(400, "That question is not part of this interview.");
        Map<String, Object> q = jdbc.queryForMap("SELECT category, question_text, expected_concepts, sample_answer FROM questions WHERE id=?", qid);
        Map<String, Object> ev = ai("/evaluate", Map.of("question", q.get("question_text"), "answer", text,
                "sampleAnswer", q.get("sample_answer"), "expectedConcepts", q.get("expected_concepts"), "category", q.get("category")));
        jdbc.update("DELETE FROM answers WHERE session_id=? AND question_id=?", id, qid);
        long aid = new SimpleJdbcInsert(jdbc).withTableName("answers").usingGeneratedKeyColumns("id")
                .executeAndReturnKey(Map.of("session_id", id, "question_id", qid, "transcript", text, "input_method", method)).longValue();
        jdbc.update("INSERT INTO answer_scores(answer_id,technical,relevance,structure,clarity,strengths,improvements,missed_concepts) VALUES(?,?,?,?,?,?,?,?)",
                aid, ev.get("technical"), ev.get("relevance"), ev.get("structure"), ev.get("clarity"),
                join(ev.get("strengths")), join(ev.get("improvements")), join(ev.get("missed")));
        return Map.of("ok", true);
    }

    @PostMapping("/interviews/{id}/finish")
    public Map<String, Object> finish(@PathVariable long id) {
        own(id);
        long u = uid();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT s.technical, s.relevance, s.structure, s.clarity, s.missed_concepts m FROM answers a JOIN answer_scores s ON s.answer_id=a.id WHERE a.session_id=?", id);
        if (rows.isEmpty()) throw new ApiException(400, "Please answer at least one question before finishing.");
        String st = jdbc.queryForObject("SELECT status FROM interview_sessions WHERE id=?", String.class, id);
        double sum = 0;
        Set<String> missed = new LinkedHashSet<>();
        for (Map<String, Object> r : rows) {
            sum += (num(r.get("technical")) + num(r.get("relevance")) + num(r.get("structure")) + num(r.get("clarity"))) / 4.0;
            missed.addAll(lines(r.get("m")));
        }
        int overall = (int) Math.round(sum / rows.size());
        if (!"COMPLETED".equals(st)) {
            jdbc.update("UPDATE interview_sessions SET status='COMPLETED', overall_score=? WHERE id=?", overall, id);
            for (String t : missed)
                jdbc.update("INSERT INTO weak_topics(user_id,topic,frequency) VALUES(?,?,1) ON DUPLICATE KEY UPDATE frequency=frequency+1, last_seen=NOW()", u, t);
            adaptPath(u, missed);
        }
        return Map.of("overall", overall);
    }

    /** Adaptive roadmap: add extra tasks for newly observed weak topics (from saved feedback only). */
    private void adaptPath(long u, Collection<String> topics) {
        List<Long> p = jdbc.queryForList("SELECT id FROM learning_paths WHERE user_id=? AND status='ACTIVE' ORDER BY id DESC LIMIT 1", Long.class, u);
        if (p.isEmpty() || topics.isEmpty()) return;
        long pid = p.get(0);
        Integer wk = jdbc.queryForObject("SELECT COALESCE(MIN(week_number),1) FROM learning_tasks WHERE path_id=? AND completed=0", Integer.class, pid);
        List<Map<String, Object>> w = jdbc.queryForList("SELECT week_title, resource_link FROM learning_tasks WHERE path_id=? AND week_number=? LIMIT 1", pid, wk);
        if (w.isEmpty()) return;
        List<String> added = new ArrayList<>();
        for (String t : topics) {
            Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM learning_tasks WHERE path_id=? AND title=?", Integer.class, pid, "Extra practice: " + t);
            if (c != null && c == 0) {
                jdbc.update("INSERT INTO learning_tasks(path_id,week_number,week_title,title,description,estimated_minutes,resource_link,is_extra) VALUES(?,?,?,?,?,?,?,1)",
                        pid, wk, w.get(0).get("week_title"), "Extra practice: " + t,
                        "Focused revision and exercises on " + t + ", added based on your interview feedback.", 45, w.get(0).get("resource_link"));
                added.add(t);
            }
        }
        if (!added.isEmpty())
            jdbc.update("UPDATE learning_paths SET adjustment_note=? WHERE id=?",
                    "Recommended adjustment: Your recent interview showed that " + String.join(", ", added) +
                    " need more practice. We've added extra exercises to Week " + wk + ".", pid);
    }

    @GetMapping("/interviews")
    public List<Map<String, Object>> history() {
        return jdbc.queryForList("SELECT id, role, type, level, DATE_FORMAT(created_at,'%d %b %Y') date, DATE_FORMAT(created_at,'%Y-%m-%d') day, overall_score score " +
                "FROM interview_sessions WHERE user_id=? AND status='COMPLETED' ORDER BY created_at DESC, id DESC", uid());
    }

    @GetMapping("/interviews/{id}/results")
    public Map<String, Object> results(@PathVariable long id) {
        own(id);
        Map<String, Object> r = new LinkedHashMap<>(jdbc.queryForMap(
                "SELECT id, role, level, type, status, overall_score overall, DATE_FORMAT(created_at,'%d %b %Y') date FROM interview_sessions WHERE id=?", id));
        List<Map<String, Object>> answers = jdbc.queryForList(
                "SELECT q.question_text question, a.transcript, a.input_method inputMethod, s.technical, s.relevance, s.structure, s.clarity, " +
                "s.strengths, s.improvements, s.missed_concepts missed, q.sample_answer sample FROM answers a JOIN questions q ON q.id=a.question_id " +
                "JOIN answer_scores s ON s.answer_id=a.id WHERE a.session_id=? ORDER BY a.id", id);
        double t = 0, re = 0, st = 0, cl = 0;
        Set<String> strengths = new LinkedHashSet<>(), improvements = new LinkedHashSet<>(), weak = new LinkedHashSet<>();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> a : answers) {
            t += num(a.get("technical")); re += num(a.get("relevance")); st += num(a.get("structure")); cl += num(a.get("clarity"));
            Map<String, Object> m = new LinkedHashMap<>(a);
            m.put("strengths", lines(a.get("strengths")));
            m.put("improvements", lines(a.get("improvements")));
            m.put("missed", lines(a.get("missed")));
            strengths.addAll(lines(a.get("strengths")));
            improvements.addAll(lines(a.get("improvements")));
            weak.addAll(lines(a.get("missed")));
            out.add(m);
        }
        int n = Math.max(1, answers.size());
        Map<String, Object> cats = new LinkedHashMap<>();
        cats.put("technical", Math.round(t / n)); cats.put("relevance", Math.round(re / n));
        cats.put("structure", Math.round(st / n)); cats.put("clarity", Math.round(cl / n));
        r.put("categories", cats);
        r.put("answers", out);
        r.put("strengths", strengths.stream().limit(4).collect(Collectors.toList()));
        r.put("improvements", improvements.stream().limit(4).collect(Collectors.toList()));
        r.put("weakTopics", new ArrayList<>(weak));
        return r;
    }

    @GetMapping("/weak-topics")
    public List<Map<String, Object>> weakTopics() {
        return jdbc.queryForList("SELECT topic, frequency FROM weak_topics WHERE user_id=? ORDER BY frequency DESC, last_seen DESC LIMIT 8", uid());
    }

    // ------------------------------------------------------------ learning paths
    @PostMapping("/learning-paths")
    @SuppressWarnings("unchecked")
    public Map<String, Object> generate(@RequestBody Map<String, Object> b) {
        long u = uid();
        List<String> fb = jdbc.queryForList("SELECT topic FROM weak_topics WHERE user_id=? ORDER BY frequency DESC, last_seen DESC LIMIT 5", String.class, u);
        List<String> mine = Arrays.stream(String.valueOf(b.getOrDefault("topics", "")).split(",")).map(String::trim).filter(x -> !x.isEmpty()).collect(Collectors.toList());
        String goal = String.valueOf(b.get("goal")), level = String.valueOf(b.get("level")), hours = String.valueOf(b.get("hours")), focus = String.valueOf(b.get("focus"));
        int weeks = Integer.parseInt(String.valueOf(b.get("weeks")));
        Map<String, Object> plan = ai("/roadmap", Map.of("goal", goal, "level", level, "weeks", weeks, "hours", hours, "focus", focus,
                "feedbackTopics", fb, "userTopics", mine));
        jdbc.update("UPDATE learning_paths SET status='ARCHIVED' WHERE user_id=? AND status='ACTIVE'", u);
        Object adj = plan.get("adjustment");
        long pid = new SimpleJdbcInsert(jdbc).withTableName("learning_paths").usingGeneratedKeyColumns("id")
                .executeAndReturnKey(Map.of("user_id", u, "goal", goal, "level", level, "weeks", weeks, "weekly_hours", hours,
                        "focus", focus, "adjustment_note", adj == null ? "" : adj.toString())).longValue();
        for (Map<String, Object> w : (List<Map<String, Object>>) plan.get("weeks")) {
            for (Map<String, Object> t : (List<Map<String, Object>>) w.get("tasks")) {
                jdbc.update("INSERT INTO learning_tasks(path_id,week_number,week_title,title,description,estimated_minutes,resource_link,is_extra) VALUES(?,?,?,?,?,?,?,?)",
                        pid, w.get("week"), w.get("title"), t.get("title"), t.get("description"), t.get("minutes"), t.get("resource"),
                        Boolean.TRUE.equals(t.get("extra")));
            }
        }
        return Map.of("id", pid);
    }

    @GetMapping("/learning-paths/current")
    public Map<String, Object> currentPath() {
        Map<String, Object> p = activePath(uid());
        return p == null ? Collections.emptyMap() : p;
    }

    @PatchMapping("/tasks/{id}")
    public Map<String, Object> toggle(@PathVariable long id, @RequestBody Map<String, Object> b) {
        boolean c = Boolean.TRUE.equals(b.get("completed"));
        jdbc.update("UPDATE learning_tasks t JOIN learning_paths p ON p.id=t.path_id SET t.completed=?, t.completed_at=IF(?,NOW(),NULL) WHERE t.id=? AND p.user_id=?",
                c, c, id, uid());
        return Map.of("ok", true);
    }

    // ------------------------------------------------------------ analytics
    @GetMapping("/analytics")
    public Map<String, Object> analytics() {
        long u = uid();
        List<Map<String, Object>> trend = jdbc.queryForList(
                "SELECT DATE_FORMAT(created_at,'%d %b') label, overall_score score FROM interview_sessions WHERE user_id=? AND status='COMPLETED' ORDER BY created_at, id", u);
        List<Map<String, Object>> skills = new ArrayList<>();
        String weakest = null;
        if (!trend.isEmpty()) {
            Map<String, Object> a = jdbc.queryForMap(
                    "SELECT ROUND(AVG(s.technical)) technical, ROUND(AVG(s.relevance)) relevance, ROUND(AVG(s.structure)) structure, ROUND(AVG(s.clarity)) clarity " +
                    "FROM answer_scores s JOIN answers a ON a.id=s.answer_id JOIN interview_sessions i ON i.id=a.session_id WHERE i.user_id=? AND i.status='COMPLETED'", u);
            String[][] names = {{"technical", "Technical Knowledge"}, {"relevance", "Answer Relevance"}, {"structure", "Answer Structure"}, {"clarity", "Communication Clarity"}};
            double low = 101;
            for (String[] n : names) {
                if (a.get(n[0]) == null) continue;
                double v = num(a.get(n[0]));
                skills.add(Map.of("name", n[1], "score", v));
                if (v < low) { low = v; weakest = n[1]; }
            }
        }
        List<Map<String, Object>> byWeek = jdbc.queryForList(
                "SELECT t.week_number week, COUNT(*) total, SUM(t.completed) done FROM learning_tasks t JOIN learning_paths p ON p.id=t.path_id " +
                "WHERE p.user_id=? AND p.status='ACTIVE' GROUP BY t.week_number ORDER BY t.week_number", u);
        long done = 0, total = 0;
        for (Map<String, Object> w : byWeek) { done += w.get("done") == null ? 0 : ((Number) w.get("done")).longValue(); total += ((Number) w.get("total")).longValue(); }
        String sug;
        int n = trend.size();
        if (n == 0) sug = "Complete your first mock interview to start seeing your progress here.";
        else if (n < 3) sug = "You have " + n + " completed interview" + (n > 1 ? "s" : "") + ". Complete at least three before drawing conclusions about your trend.";
        else {
            double diff = num(trend.get(n - 1).get("score")) - num(trend.get(0).get("score"));
            sug = (diff >= 5 ? "Your latest score is higher than your first interview. " : diff <= -5 ? "Your latest score is lower than your first interview, so review the feedback on recent answers. " : "Your scores have stayed fairly steady. ")
                    + (weakest != null ? "Your lowest-scoring area so far is " + weakest.toLowerCase() + ", so consider focusing your next practice there. " : "")
                    + "These are practice estimates based on your transcripts.";
        }
        Map<String, Object> comp = new LinkedHashMap<>();
        comp.put("done", done); comp.put("total", total); comp.put("byWeek", byWeek);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("trend", trend); r.put("skills", skills); r.put("completion", comp); r.put("suggestion", sug);
        return r;
    }

    // ------------------------------------------------------------ profile
    @GetMapping("/profile")
    public Map<String, Object> profile() {
        return jdbc.queryForMap("SELECT name, email, target_role targetRole, skill_level level, weekly_hours weeklyHours FROM users WHERE id=?", uid());
    }

    @PutMapping("/profile")
    public Map<String, Object> saveProfile(@RequestBody Map<String, String> b) {
        String name = b.getOrDefault("name", "").trim();
        if (name.isEmpty()) throw new ApiException(400, "Please enter your full name.");
        jdbc.update("UPDATE users SET name=?, target_role=?, skill_level=?, weekly_hours=? WHERE id=?",
                name, b.get("targetRole"), b.get("level"), b.get("weeklyHours"), uid());
        return Map.of("ok", true);
    }

    @PutMapping("/profile/password")
    public Map<String, Object> password(@RequestBody Map<String, String> b) {
        String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE id=?", String.class, uid());
        if (!enc.matches(b.getOrDefault("currentPassword", ""), hash)) throw new ApiException(400, "Current password is incorrect.");
        String np = b.getOrDefault("newPassword", "");
        if (np.length() < 8) throw new ApiException(400, "Password must be at least 8 characters.");
        jdbc.update("UPDATE users SET password_hash=? WHERE id=?", enc.encode(np), uid());
        return Map.of("ok", true);
    }
}
