# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from academic.models import Assessment, Question

# Clear existing questions to avoid duplicates if re-run
Question.objects.all().delete()

# Find Calculus Mid-Term
calc = Assessment.objects.filter(title="Calculus Mid-Term").first()
if calc:
    Question.objects.create(
        assessment=calc,
        text="What is the derivative of x^2?",
        type="mcq",
        options=["x", "2x", "x^2", "2"],
        correct_answer="2x",
        points=2,
        order=1,
    )
    Question.objects.create(
        assessment=calc,
        text="Integral of 1/x dx is?",
        type="mcq",
        options=["ln|x| + C", "e^x", "1/x^2", "-1/x"],
        correct_answer="ln|x| + C",
        points=2,
        order=2,
    )
    Question.objects.create(
        assessment=calc,
        text="Explain the geometric interpretation of the derivative.",
        type="long_answer",
        points=6,
        order=3,
    )
    print("Populated Calculus Questions")

chem = Assessment.objects.filter(title="Organic Chemistry Quiz").first()
if chem:
    Question.objects.create(
        assessment=chem,
        text="Which element is the basis of organic chemistry?",
        type="mcq",
        options=["Carbon", "Oxygen", "Gold", "Helium"],
        correct_answer="Carbon",
        points=1,
        order=1,
    )
    Question.objects.create(
        assessment=chem,
        text="What is the formula for Methane?",
        type="mcq",
        options=["CH4", "C2H6", "CO2", "H2O"],
        correct_answer="CH4",
        points=1,
        order=2,
    )
    Question.objects.create(
        assessment=chem,
        text="Benzene has how many carbon atoms?",
        type="mcq",
        options=["4", "5", "6", "8"],
        correct_answer="6",
        points=1,
        order=3,
    )
    print("Populated Chemistry Questions")

# Add some to a past quiz just in case
past = Assessment.objects.filter(title="Newton's Laws Quiz").first()
if past:
    Question.objects.create(
        assessment=past,
        text="F = ma refers to which law?",
        type="mcq",
        options=["1st", "2nd", "3rd", "Law of Gravity"],
        correct_answer="2nd",
        points=1,
        order=1,
    )
    print("Populated Physics Questions")

print("✅ Question Data Populated!")
