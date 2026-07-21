# Sprint 15: Exam Logistics & Academic Operations 🏫📝

**Focus**: Complete the exam management lifecycle by implementing automated seating, hall ticket generation, and a centralized operations dashboard.

## 🎯 Objectives

1.  **Exam Operations Dashboard**: A command center for Admins to convert assessments into formal Exams, set centers, and manage logistics.
2.  **Automated Seating Engine**: A backend service to intelligently allocate students to seats across different exam halls, respecting seating capacities.
3.  **Hall Ticket System**: Formal PDF generation for Hall Tickets, including student photos, exam schedules, and center instructions.
4.  **Lifecycle Management**: Support for `Draft`, `Published`, and `Results Released` states with corresponding automated notifications.

## 📋 Technical Breakdown

### Backend Enhancements
- **ExamService**: Logic for bulk seating allocation and hall ticket batch processing.
- **Reports Integration**: New PDF template for Hall Tickets (sharing components with Result Cards).
- **APIs**: New actions in `ExamViewSet` for `allocation`, `publish`, and `generate_tickets`.

### Frontend Components
- **/admin/exams**: A management hub for school administrators.
- **Seating Map View**: Visual representation of allocated seats.
- **Student Download Portal**: A simple view for students to download their specific Hall Tickets.

## 📅 Timeline

- **Day 1-2**: Backend Logic & Seating Engine.
- **Day 3**: Hall Ticket PDF Template & Generation logic.
- **Day 4**: Admin Management UI & Seating Viz.
- **Day 5**: Student Portal integration & Sprint Verification.

## ✅ Success Metrics
- [ ] Admin can allocate 100+ students to seats in < 1 second.
- [ ] Students can download a print-ready PDF Hall Ticket.
- [ ] Automated notifications triggered when exams are published.
