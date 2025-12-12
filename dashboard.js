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
    document.getElementById('userName').textContent = currentUser.email;
    
    if (currentUser.role === 'teacher') {
        document.getElementById('createCourseMenu').style.display = 'block';
    }
    
    loadCourses();
}

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(e.target.dataset.section);
        });
    });
    
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('createCourseForm').addEventListener('submit', createCourse);
    document.getElementById('assignGradeForm').addEventListener('submit', assignGrade);
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
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
    
    document.getElementById(`${section}-section`).classList.add('active');
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    if (section === 'courses') {
        loadCourses();
    } else if (section === 'grades') {
        loadGrades();
    } else if (section === 'messages') {
        loadMessages();
    }
}

async function loadCourses() {
    try {
        if (currentUser.role === 'user') {
            const response = await fetch(`${API_URL}/enrolments/students/me/courses`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            displayMyCourses(data.courses);
            
            document.getElementById('allCoursesSection').style.display = 'block';
            loadAllCourses();
        } else {
            loadAllCourses();
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

async function loadAllCourses() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const data = await response.json();
        displayAllCourses(data.courses);
    } catch (error) {
        console.error('Error loading all courses:', error);
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
            <h3>Course ID: ${course.COURSE_ID}</h3>
            <p>Email: ${course.EMAIL}</p>
        </div>
    `).join('');
}

function displayAllCourses(courses) {
    const grid = currentUser.role === 'user' 
        ? document.getElementById('allCoursesGrid')
        : document.getElementById('coursesGrid');
    
    if (!courses || courses.length === 0) {
        grid.innerHTML = '<p>No courses available.</p>';
        return;
    }
    
    if (currentUser.role === 'user') {
        grid.innerHTML = courses.map(course => `
            <div class="course-card">
                <h3>${course.COURSE_NAME}</h3>
                <p>Capacity: ${course.CAPACITY}</p>
                <p>Instructor ID: ${course.USER_ID}</p>
                <button class="btn-enroll" onclick="enrollInCourse(${course.COURSE_ID})">Enroll</button>
            </div>
        `).join('');
    } else {
        displayTeacherCourses(courses);
    }
}

function displayTeacherCourses(courses) {
    const teacherCourses = courses.filter(c => c.USER_ID === currentUser.id);
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                STUDENT_ID: currentUser.id,
                EMAIL: currentUser.email
            })
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        displayGrades(data.grades);
    } catch (error) {
        console.error('Error loading grades:', error);
    }
}

function displayGrades(grades) {
    const container = document.getElementById('gradesTable');
    
    if (!grades || grades.length === 0) {
        container.innerHTML = '<p>No grades available yet.</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="grades-table">
            <thead>
                <tr>
                    <th>Course ID</th>
                    <th>Grade</th>
                </tr>
            </thead>
            <tbody>
                ${grades.map(grade => `
                    <tr>
                        <td>${grade.COURSE_ID}</td>
                        <td>${grade.GRADE_VALUE || 'Not graded'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadMessages() {
    try {
        const response = await fetch(`${API_URL}/messages/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        displayMessages(data.messages);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = '<p>No messages yet.</p>';
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const history = msg.MESSAGES_HISTORY ? msg.MESSAGES_HISTORY.split('|||') : [];
        return `
            <div class="message-box">
                <p><strong>From User ID:</strong> ${msg.FROM_USER_ID}</p>
                <p><strong>To User ID:</strong> ${msg.TO_USER_ID}</p>
                <div class="message-history">
                    ${history.map(m => `<p class="message-item">${m}</p>`).join('')}
                </div>
            </div>
        `;
    }).join('');
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                TO_USER_ID: parseInt(recipientId),
                MESSAGE_TEXT: messageText
            })
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
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                COURSE_NAME: courseName,
                USER_ID: currentUser.id,
                CAPACITY: parseInt(capacity)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Course created successfully!');
            document.getElementById('createCourseForm').reset();
            loadCourses();
        } else {
            alert(data.error || 'Failed to create course');
        }
    } catch (error) {
        alert('Error creating course');
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
        const response = await fetch(`${API_URL}/enrolments/courses/${courseId}/students`);
        const data = await response.json();
        displayEnrolledStudents(data.students);
    } catch (error) {
        console.error('Error loading students:', error);
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
            <p><strong>Student ID:</strong> ${student.STUDENT_ID}</p>
            <p><strong>Email:</strong> ${student.EMAIL}</p>
        </div>
    `).join('');
}

async function loadCourseGrades(courseId) {
    try {
        const response = await fetch(`${API_URL}/grades/courses/${courseId}/grades`);
        const data = await response.json();
        displayCourseGrades(data.grades);
    } catch (error) {
        console.error('Error loading grades:', error);
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
            <thead>
                <tr>
                    <th>Student ID</th>
                    <th>Grade</th>
                </tr>
            </thead>
            <tbody>
                ${grades.map(grade => `
                    <tr>
                        <td>${grade.STUDENT_ID}</td>
                        <td>${grade.GRADE_VALUE || 'Not graded'}</td>
                    </tr>
                `).join('')}
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
        const response = await fetch(`${API_URL}/grades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                STUDENT_ID: parseInt(studentId),
                COURSE_ID: currentCourseId,
                GRADE_VALUE: gradeValue
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Grade assigned successfully!');
            document.getElementById('assignGradeForm').reset();
            loadCourseGrades(currentCourseId);
        } else {
            alert(data.error || 'Failed to assign grade');
        }
    } catch (error) {
        alert('Error assigning grade');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
