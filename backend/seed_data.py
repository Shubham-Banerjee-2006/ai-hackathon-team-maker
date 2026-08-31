"""
Populates the database with a sample roster of 16 hackathon participants
so you can try team generation immediately without registering manually.

Run:  python seed_data.py
"""
from app.database import SessionLocal, Base, engine
from app import models
from app.utils import list_to_csv

Base.metadata.create_all(bind=engine)

SAMPLE = [
    dict(name="Aisha Khan", email="aisha@example.com", skills=["Python", "Machine Learning", "NLP"],
         domains=["Healthcare"], preferred_role="ML", experience_level="Advanced",
         working_style="Likes structured sprints, morning person",
         bio="I love building ML models that solve real medical problems."),
    dict(name="Ben Torres", email="ben@example.com", skills=["React", "TypeScript", "CSS"],
         domains=["Education", "FinTech"], preferred_role="Frontend", experience_level="Intermediate",
         working_style="Prefers pairing, flexible hours",
         bio="Frontend dev who cares about clean, accessible UI."),
    dict(name="Chloe Martin", email="chloe@example.com", skills=["UI/UX", "Figma", "Product Design"],
         domains=["Healthcare", "Education"], preferred_role="Design", experience_level="Intermediate",
         working_style="Visual thinker, likes whiteboarding sessions",
         bio="Designer obsessed with turning messy ideas into simple flows."),
    dict(name="Devon Lee", email="devon@example.com", skills=["Python", "FastAPI", "SQL", "Backend"],
         domains=["FinTech"], preferred_role="Backend", experience_level="Advanced",
         working_style="Night owl, likes owning infra",
         bio="Backend engineer who enjoys designing clean APIs."),
    dict(name="Emma Wilson", email="emma@example.com", skills=["Cloud", "AWS", "DevOps", "Docker"],
         domains=["Climate"], preferred_role="Cloud", experience_level="Advanced",
         working_style="Methodical, documents everything",
         bio="Infra person passionate about climate-tech deployments."),
    dict(name="Farid Hassan", email="farid@example.com", skills=["Machine Learning", "PyTorch", "Python"],
         domains=["Climate", "Healthcare"], preferred_role="ML", experience_level="Beginner",
         working_style="Eager learner, likes mentorship",
         bio="New to ML but has done a few Kaggle competitions."),
    dict(name="Grace Kim", email="grace@example.com", skills=["React", "UI/UX", "JavaScript"],
         domains=["Education"], preferred_role="Frontend", experience_level="Beginner",
         working_style="Collaborative, likes daily check-ins",
         bio="Bootcamp grad excited to build my first real hackathon project."),
    dict(name="Hassan Ali", email="hassan@example.com", skills=["Product Management", "Business", "Pitching"],
         domains=["FinTech", "Healthcare"], preferred_role="PM", experience_level="Intermediate",
         working_style="Big-picture thinker, keeps the team on track",
         bio="I like turning technical work into a story judges remember."),
    dict(name="Ines Rossi", email="ines@example.com", skills=["Python", "Data Science", "SQL"],
         domains=["Climate"], preferred_role="ML", experience_level="Intermediate",
         working_style="Detail-oriented, likes clean notebooks",
         bio="Data scientist interested in environmental datasets."),
    dict(name="Jamal Carter", email="jamal@example.com", skills=["Backend", "Node", "API"],
         domains=["Education"], preferred_role="Backend", experience_level="Beginner",
         working_style="Flexible, happy to learn new stacks",
         bio="Self-taught backend dev, first hackathon."),
    dict(name="Karla Novak", email="karla@example.com", skills=["UI/UX", "Design", "Figma"],
         domains=["FinTech"], preferred_role="Design", experience_level="Advanced",
         working_style="Fast iterator, likes rapid prototyping",
         bio="Product designer who has shipped 3 fintech apps."),
    dict(name="Liam O'Connor", email="liam@example.com", skills=["Cloud", "GCP", "Kubernetes"],
         domains=["Healthcare"], preferred_role="Cloud", experience_level="Intermediate",
         working_style="Calm under pressure, likes owning deploys",
         bio="Cloud engineer who enjoys healthcare-adjacent projects."),
    dict(name="Maya Singh", email="maya@example.com", skills=["Machine Learning", "NLP", "Python"],
         domains=["Education"], preferred_role="ML", experience_level="Advanced",
         working_style="Independent worker, syncs twice a day",
         bio="Grad student researching NLP for personalized learning."),
    dict(name="Noah Becker", email="noah@example.com", skills=["React", "Backend", "FastAPI"],
         domains=["Climate", "FinTech"], preferred_role="Backend", experience_level="Intermediate",
         working_style="Full-stack generalist, adapts to team needs",
         bio="I like projects that touch both frontend and backend."),
    dict(name="Olivia Perez", email="olivia@example.com", skills=["Product Management", "UI/UX"],
         domains=["Climate"], preferred_role="PM", experience_level="Beginner",
         working_style="Organized, likes clear task boards",
         bio="First hackathon, excited to help coordinate the team."),
    dict(name="Priya Nair", email="priya@example.com", skills=["Python", "Machine Learning", "Cloud"],
         domains=["Healthcare", "FinTech"], preferred_role="ML", experience_level="Advanced",
         working_style="Likes owning the model pipeline end-to-end",
         bio="ML engineer who has deployed models to production before."),
]


def run():
    db = SessionLocal()
    added = 0
    for entry in SAMPLE:
        exists = db.query(models.Participant).filter(models.Participant.email == entry["email"]).first()
        if exists:
            continue
        db.add(models.Participant(
            name=entry["name"],
            email=entry["email"],
            skills=list_to_csv(entry["skills"]),
            domains=list_to_csv(entry["domains"]),
            preferred_role=entry["preferred_role"],
            experience_level=entry["experience_level"],
            working_style=entry["working_style"],
            availability="Full-time",
            bio=entry["bio"],
        ))
        added += 1
    db.commit()
    db.close()
    print(f"Seeded {added} new participants.")


if __name__ == "__main__":
    run()
