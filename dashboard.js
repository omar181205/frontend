const API_URL = 'http://localhost:5000';
let currentUser = null;
let token = null;

window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function checkAuth() {
    token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    if (!token || !userString) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = JSON.parse(userString);
    const userIdEl = document.getElementById('userId');
    if (userIdEl) userIdEl.textContent = `ID: ${currentUser.id}`;
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = currentUser.email;
    document.getElementById('userRole').textContent = `Role: ${currentUser.role === 'user' ? 'Student' : 'Teacher'}`;
    if (currentUser.role === 'teacher') {
        document.getElementById('createCourseMenu').style.display = 'block';
    }
    loadCourses();
}

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(e.target.dataset.section);
        });
    });
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('createCourseForm').addEventListener('submit', createCourse);
    document.getElementById('assignGradeForm').addEventListener('submit', assignGrade);
    document.getElementById('updateCapacityForm').addEventListener('submit', updateCapacity);
    document.getElementById('deleteCourseBtn').addEventListener('click', deleteCourse);
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

function switchSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
    
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) {
        sectionElement.classList.add('active');
    }
    
    const menuLink = document.querySelector(`[data-section="${section}"]`);
    if (menuLink) {
        menuLink.classList.add('active');
    }
    
    if (section === 'courses') loadCourses();
    else if (section === 'grades') loadGrades();
    else if (section === 'messages') loadMessages();
}

async function loadCourses() {
    try {
        if (currentUser.role === 'user') {
            const response = await fetch(`${API_URL}/enrolments/students/me/courses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            displayMyCourses(data.courses);
            document.getElementById('allCoursesSection').style.display = 'block';
        }
        loadAllCourses();
    } catch (error) {
        alert('Error loading courses');
    }
}

async function loadAllCourses() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const data = await response.json();
        displayAllCourses(data.courses);
    } catch (error) {
        alert('Error loading courses');
    }
}

function displayMyCourses(courses) {
    const grid = document.getElementById('coursesGrid');
    if (!courses || courses.length === 0) {
        grid.innerHTML = '<p>You are not enrolled in any courses yet.</p>';
        return;
    }
    grid.innerHTML = courses.map(course => `
        <div class="course-card">
            <h3>Course: ${course.COURSE_ID}</h3>
            <p><strong>Status:</strong> Enrolled</p>
            <p><strong>Email:</strong> ${course.EMAIL}</p>
        </div>
    `).join('');
}

function displayAllCourses(courses) {
    const grid = currentUser.role === 'user' ? document.getElementById('allCoursesGrid') : document.getElementById('coursesGrid');
    if (!courses || courses.length === 0) {
        grid.innerHTML = '<p>No courses available.</p>';
        return;
    }
    if (currentUser.role === 'user') {
        fetch(`${API_URL}/auth/users`)
            .then(res => res.json())
            .then(data => {
                const users = data.users || [];
                const userMap = {};
                users.forEach(u => {
                    userMap[u.USER_ID] = { id: u.USER_ID, email: u.EMAIL };
                });
                
                grid.innerHTML = courses.map(course => {
                    const instructor = userMap[course.USER_ID] || { id: course.USER_ID, email: 'N/A' };
                    return `
                        <div class="course-card">
                            <h3>${course.COURSE_NAME}</h3>
                            <p>Capacity: ${course.CAPACITY}</p>
                            <p>Instructor: ID: ${instructor.id} (${instructor.email})</p>
                            <button class="btn-enroll" onclick="enrollInCourse(${course.COURSE_ID})">Enroll</button>
                        </div>
                    `;
                }).join('');
            })
            .catch(err => {
                grid.innerHTML = courses.map(course => `
                    <div class="course-card">
                        <h3>${course.COURSE_NAME}</h3>
                        <p>Capacity: ${course.CAPACITY}</p>
                        <p>Instructor ID: ${course.USER_ID}</p>
                        <button class="btn-enroll" onclick="enrollInCourse(${course.COURSE_ID})">Enroll</button>
                    </div>
                `).join('');
            });
    } else {
        displayTeacherCourses(courses);
    }
}

function displayTeacherCourses(courses) {
    const teacherCourses = courses.filter(c => c.USER_ID === currentUser.id);
    console.log('Current User ID:', currentUser.id);
    console.log('All Courses:', courses);
    console.log('Teacher Courses:', teacherCourses);
    const grid = document.getElementById('teacherCoursesGrid');
    if (!teacherCourses || teacherCourses.length === 0) {
        grid.innerHTML = '<p>You have not created any courses yet.</p>';
        return;
    }
    grid.innerHTML = teacherCourses.map(course => `
        <div class="course-card">
            <h3>${course.COURSE_NAME}</h3>
            <p>Capacity: ${course.CAPACITY}</p>
            <button class="btn-manage" onclick="manageCourse(${course.COURSE_ID}, '${course.COURSE_NAME}')">Manage</button>
        </div>
    `).join('');
}

async function enrollInCourse(courseId) {
    try {
        const response = await fetch(`${API_URL}/enrolments/courses/${courseId}/enrollments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ STUDENT_ID: currentUser.id, EMAIL: currentUser.email })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Enrolled successfully!');
            loadCourses();
        } else {
            alert(data.error || 'Enrollment failed');
        }
    } catch (error) {
        alert('Error enrolling in course');
    }
}

async function loadGrades() {
    if (currentUser.role !== 'user') {
        document.getElementById('gradesTable').innerHTML = '<p>Grades view is for students only.</p>';
        return;
    }
    try {
        const response = await fetch(`${API_URL}/grades/students/me/grades`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        displayGrades(data.grades);
    } catch (error) {
        alert('Error loading grades');
    }
}

function displayGrades(grades) {
    const container = document.getElementById('gradesTable');
    if (!grades || grades.length === 0) {
        container.innerHTML = '<p>No grades available yet.</p>';
        return;
    }
    
    fetch(`${API_URL}/courses`)
        .then(res => res.json())
        .then(data => {
            const courses = data.courses || [];
            const courseMap = {};
            courses.forEach(c => {
                courseMap[c.COURSE_ID] = c.COURSE_NAME;
            });
            
            container.innerHTML = `
                <table class="grades-table">
                    <thead><tr><th>Course ID</th><th>Course Name</th><th>Grade</th></tr></thead>
                    <tbody>
                        ${grades.map(grade => `<tr><td>${grade.COURSE_ID}</td><td>${courseMap[grade.COURSE_ID] || 'N/A'}</td><td>${grade.GRADE_VALUE || 'Not graded'}</td></tr>`).join('')}
                    </tbody>
                </table>
            `;
        })
        .catch(err => {
            container.innerHTML = `
                <table class="grades-table">
                    <thead><tr><th>Course ID</th><th>Grade</th></tr></thead>
                    <tbody>
                        ${grades.map(grade => `<tr><td>${grade.COURSE_ID}</td><td>${grade.GRADE_VALUE || 'Not graded'}</td></tr>`).join('')}
                    </tbody>
                </table>
            `;
        });
}

async function loadMessages() {
    try {
        const response = await fetch(`${API_URL}/messages/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        displayMessages(data.messages);
    } catch (error) {
        alert('Error loading messages');
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!messages || messages.length === 0) {
        container.innerHTML = '<p>No messages yet.</p>';
        return;
    }
    
    fetch(`${API_URL}/auth/users`)
        .then(res => res.json())
        .then(data => {
            const users = data.users || [];
            const userMap = {};
            users.forEach(u => {
                userMap[u.USER_ID] = { id: u.USER_ID, email: u.EMAIL };
            });
            
            container.innerHTML = messages.map(msg => {
                const history = msg.MESSAGES_HISTORY ? msg.MESSAGES_HISTORY.split('|||') : [];
                const fromUser = userMap[msg.FROM_USER_ID] || { id: msg.FROM_USER_ID, email: msg.FROM_USER_ID };
                const toUser = userMap[msg.TO_USER_ID] || { id: msg.TO_USER_ID, email: msg.TO_USER_ID };
                return `
                    <div class="message-box">
                        <p><strong>From:</strong> ID: ${fromUser.id} (${fromUser.email})</p>
                        <p><strong>To:</strong> ID: ${toUser.id} (${toUser.email})</p>
                        <div class="message-history">
                            ${history.map(m => `<p class="message-item">${m}</p>`).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        })
        .catch(err => {
            container.innerHTML = messages.map(msg => {
                const history = msg.MESSAGES_HISTORY ? msg.MESSAGES_HISTORY.split('|||') : [];
                return `
                    <div class="message-box">
                        <p><strong>From:</strong> ID: ${msg.FROM_USER_ID}</p>
                        <p><strong>To:</strong> ID: ${msg.TO_USER_ID}</p>
                        <div class="message-history">
                            ${history.map(m => `<p class="message-item">${m}</p>`).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        });
}

async function sendMessage() {
    const recipientId = document.getElementById('recipientId').value;
    const messageText = document.getElementById('messageText').value;
    if (!recipientId || !messageText) {
        alert('Please fill in all fields');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ TO_USER_ID: parseInt(recipientId), MESSAGE_TEXT: messageText })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Message sent!');
            document.getElementById('recipientId').value = '';
            document.getElementById('messageText').value = '';
            loadMessages();
        } else {
            alert(data.error || 'Failed to send message');
        }
    } catch (error) {
        alert('Error sending message');
    }
}

async function createCourse(e) {
    e.preventDefault();
    const courseName = document.getElementById('courseName').value;
    const capacity = document.getElementById('capacity').value;
    
    if (!courseName || !capacity) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ COURSE_NAME: courseName, USER_ID: currentUser.id, CAPACITY: parseInt(capacity) })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Course created successfully!');
            document.getElementById('createCourseForm').reset();
            loadAllCourses();
            
            const allCoursesResponse = await fetch(`${API_URL}/courses`);
            const allCoursesData = await allCoursesResponse.json();
            
            if (allCoursesData.courses) {
                const teacherCourses = allCoursesData.courses.filter(c => c.USER_ID === currentUser.id);
                const grid = document.getElementById('teacherCoursesGrid');
                
                if (teacherCourses.length === 0) {
                    grid.innerHTML = '<p>No courses yet. Create one above!</p>';
                } else {
                    grid.innerHTML = teacherCourses.map(course => `
                        <div class="course-card">
                            <h3>${course.COURSE_NAME}</h3>
                            <p>Capacity: ${course.CAPACITY}</p>
                            <button class="btn-manage" onclick="manageCourse(${course.COURSE_ID}, '${course.COURSE_NAME}')">Manage</button>
                        </div>
                    `).join('');
                }
            }
        } else {
            alert(data.error || 'Failed to create course');
        }
    } catch (error) {
        alert('Error creating course: ' + error.message);
    }
}

let currentCourseId = null;

function manageCourse(courseId, courseName) {
    currentCourseId = courseId;
    document.getElementById('manageCourseTitle').textContent = `Manage: ${courseName}`;
    switchSection('manage-course');
    loadEnrolledStudents(courseId);
    loadCourseGrades(courseId);
}

async function loadEnrolledStudents(courseId) {
    try {
        const response = await fetch(`${API_URL}/enrolments/courses/${courseId}/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            document.getElementById('enrolledStudents').innerHTML = `<p>Error: ${response.status}</p>`;
            return;
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
            displayEnrolledStudents(data);
        } else if (data.students && Array.isArray(data.students)) {
            displayEnrolledStudents(data.students);
        } else if (typeof data === 'object') {
            const students = Object.values(data).filter(item => item && typeof item === 'object' && item.STUDENT_ID);
            displayEnrolledStudents(students);
        } else {
            document.getElementById('enrolledStudents').innerHTML = '<p>No students enrolled in this course.</p>';
        }
    } catch (error) {
        document.getElementById('enrolledStudents').innerHTML = '<p>Error loading students: ' + error.message + '</p>';
    }
}

function displayEnrolledStudents(students) {
    const container = document.getElementById('enrolledStudents');
    if (!students || students.length === 0) {
        container.innerHTML = '<p>No students enrolled yet.</p>';
        return;
    }
    container.innerHTML = students.map(student => `
        <div class="student-card">
            <p><strong>Student:</strong> ID: ${student.STUDENT_ID} (${student.EMAIL})</p>
            <button class="btn-delete-student" onclick="deleteStudent(${currentCourseId}, ${student.STUDENT_ID})">Remove Student</button>
        </div>
    `).join('');
}

async function loadCourseGrades(courseId) {
    try {
        const response = await fetch(`${API_URL}/grades/courses/${courseId}/grades`);
        const data = await response.json();
        displayCourseGrades(data.grades);
    } catch (error) {
        alert('Error loading grades');
    }
}

function displayCourseGrades(grades) {
    const container = document.getElementById('courseGradesTable');
    if (!grades || grades.length === 0) {
        container.innerHTML = '<p>No grades assigned yet.</p>';
        return;
    }
    container.innerHTML = `
        <table class="grades-table">
            <thead><tr><th>Student ID</th><th>Grade</th></tr></thead>
            <tbody>
                ${grades.map(grade => `<tr><td>${grade.STUDENT_ID}</td><td>${grade.GRADE_VALUE || 'Not graded'}</td></tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function assignGrade(e) {
    e.preventDefault();
    const studentId = document.getElementById('studentId').value;
    const gradeValue = document.getElementById('gradeValue').value;
    if (!currentCourseId) {
        alert('Please select a course first');
        return;
    }
    
    try {
        const gradesResponse = await fetch(`${API_URL}/grades/courses/${currentCourseId}`);
        const gradesData = await gradesResponse.json();
        const grades = gradesData.grades || [];

        const existingGrade = grades.find(g => g.STUDENT_ID === parseInt(studentId));
        
        if (existingGrade) {
            const updateResponse = await fetch(`${API_URL}/grades/${existingGrade.GRADE_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ STUDENT_ID: parseInt(studentId), COURSE_ID: currentCourseId, GRADE_VALUE: gradeValue })
            });
            const updateData = await updateResponse.json();
            if (updateResponse.ok) {
                alert('Grade updated successfully!');
                document.getElementById('assignGradeForm').reset();
                loadCourseGrades(currentCourseId);
            } else {
                alert(updateData.error || 'Failed to update grade');
            }
        } else {
            const createResponse = await fetch(`${API_URL}/grades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ STUDENT_ID: parseInt(studentId), COURSE_ID: currentCourseId, GRADE_VALUE: gradeValue })
            });
            const createData = await createResponse.json();
            if (createResponse.ok) {
                alert('Grade assigned successfully!');
                document.getElementById('assignGradeForm').reset();
                loadCourseGrades(currentCourseId);
            } else {
                alert(createData.error || 'Failed to assign grade');
            }
        }
    } catch (error) {
        alert('Error assigning grade: ' + error.message);
    }
}

async function updateCapacity(e) {
    e.preventDefault();
    const newCapacity = document.getElementById('newCapacity').value;
    if (!currentCourseId) {
        alert('Please select a course first');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/courses/${currentCourseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ CAPACITY: parseInt(newCapacity) })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Capacity updated successfully!');
            document.getElementById('updateCapacityForm').reset();
            loadCourses();
        } else {
            alert(data.error || 'Failed to update capacity');
        }
    } catch (error) {
        alert('Error updating capacity');
    }
}

async function deleteStudent(courseId, studentId) {
    if (!confirm('Are you sure you want to remove this student from the course?')) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/enrolments/courses/${courseId}/students/${studentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            alert('Student removed successfully!');
            loadEnrolledStudents(courseId);
        } else {
            alert(data.error || 'Failed to remove student');
        }
    } catch (error) {
        alert('Error removing student: ' + error.message);
    }
}

async function deleteCourse() {
    if (!currentCourseId) {
        alert('Please select a course first');
        return;
    }
    if (!confirm('Are you sure you want to delete this course?')) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/courses/${currentCourseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            alert('Course deleted successfully!');
            currentCourseId = null;
            switchSection('create-course');
            loadCourses();
        } else {
            alert(data.error || 'Failed to delete course');
        }
    } catch (error) {
        alert('Error deleting course');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
