# Sprint 6: Content Management System (LMS Studio) - Kickoff
**Focus**: Enable Teachers/Admins to create, organize, and publish rich educational content directly from the UI.

## 🎯 Objectives
1.  **Visual Curriculum Builder**: Create a drag-and-drop interface for structuring Chapters and Lessons.
2.  **Rich Text Authoring**: Integrate a modern WYSIWYG editor for lesson content.
3.  **Quiz Builder**: Implement a UI for creating assessments with various question types.
4.  **Publishing Workflow**: Robust "Draft vs. Published" states to ensure content quality.

## 🛠️ Tech Stack Additions
-   **dnd-kit**: For drag-and-drop reordering of curriculum items.
-   **TipTap** (or similar): For Notion-style rich text editing.
-   **React Dropzone**: For handling file uploads (Lesson Materials).

## 📋 Epic Breakdown

### Epic 1: The Course Studio
A comprehensive dashboard for teachers to manage their courses.
-   **Course Settings**: Edit Title, Description, Thumbnail.
-   **Curriculum View**: Tree view of Chapters > Lessons.

### Epic 2: Curriculum Management
-   **Add/Edit/Delete**: API integrations for managing structural elements.
-   **Reordering**: Drag-and-drop to change the sequence of lessons.

### Epic 3: Lesson Authoring
-   **Text**: Rich text editor.
-   **Video**: Embed URL management.
-   **Materials**: File attachment management.

### Epic 4: Assessment Engine
-   **Quiz Editor**: Add questions, set correct answers, define marks.

## 📅 Timeline Estimate
-   **Phase 1**: Infrastructure & Course Settings (1 Day)
-   **Phase 2**: Curriculum Builder (2 Days)
-   **Phase 3**: Content Editor & Quizzes (2 Days)
