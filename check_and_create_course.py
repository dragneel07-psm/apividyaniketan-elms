import requests
import sys

CLASS_ID = "0bda0494-b690-466b-aed6-05d85a5c29c3"
API_URL = "http://localhost:8000/api/academic/courses/"

try:
    response = requests.get(API_URL)
    courses = response.json()
    
    class_courses = [c for c in courses if c.get('academic_class') == CLASS_ID]
    
    if class_courses:
        print(f"Found {len(class_courses)} courses for class {CLASS_ID}")
        for c in class_courses:
            print(f"- {c['subject']} ({c['course_id']})")
    else:
        print(f"No courses found for class {CLASS_ID}")
        print("Creating default course 'General Science'...")
        
        # Create Course
        create_payload = {
            "academic_class": CLASS_ID,
            "subject": "General Science"
        }
        create_response = requests.post(API_URL, json=create_payload)
        
        if create_response.status_code in [200, 201]:
            print("Successfully created course.")
            print(create_response.json())
        else:
            print(f"Failed to create course: {create_response.status_code}")
            print(create_response.text)

except Exception as e:
    print(f"Error: {e}")
