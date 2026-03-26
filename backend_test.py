import requests
import sys
import json
from datetime import datetime

class SahubAPITester:
    def __init__(self, base_url="https://collab-hub-228.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different users
        self.users = {}   # Store user data
        self.test_data = {}  # Store created test data
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self, name, email, password, role="member"):
        """Test user registration"""
        success, response = self.run_test(
            f"Register {role} user: {name}",
            "POST",
            "auth/register",
            200,
            data={"name": name, "email": email, "password": password, "role": role}
        )
        if success and 'token' in response:
            self.tokens[role] = response['token']
            self.users[role] = response['user']
            return True, response
        return False, {}

    def test_user_login(self, email, password, role_key):
        """Test user login"""
        success, response = self.run_test(
            f"Login {role_key} user",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.tokens[role_key] = response['token']
            self.users[role_key] = response['user']
            return True, response
        return False, {}

    def test_get_me(self, role_key):
        """Test get current user"""
        success, response = self.run_test(
            f"Get current user ({role_key})",
            "GET",
            "auth/me",
            200,
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_get_users(self, role_key):
        """Test get all users"""
        success, response = self.run_test(
            f"Get all users ({role_key})",
            "GET",
            "users",
            200,
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_create_task(self, role_key, title, description="", assigned_to=None, priority="medium"):
        """Test task creation"""
        task_data = {
            "title": title,
            "description": description,
            "priority": priority,
            "status": "todo"
        }
        if assigned_to:
            task_data["assigned_to"] = assigned_to

        success, response = self.run_test(
            f"Create task ({role_key}): {title}",
            "POST",
            "tasks",
            200,
            data=task_data,
            token=self.tokens.get(role_key)
        )
        if success and 'id' in response:
            if 'tasks' not in self.test_data:
                self.test_data['tasks'] = []
            self.test_data['tasks'].append(response)
        return success, response

    def test_get_tasks(self, role_key):
        """Test get all tasks"""
        success, response = self.run_test(
            f"Get all tasks ({role_key})",
            "GET",
            "tasks",
            200,
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_update_task_status(self, role_key, task_id, new_status):
        """Test task status update"""
        success, response = self.run_test(
            f"Update task status ({role_key}): {new_status}",
            "PATCH",
            f"tasks/{task_id}",
            200,
            data={"status": new_status},
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_add_comment(self, role_key, task_id, comment_text):
        """Test adding comment to task"""
        success, response = self.run_test(
            f"Add comment ({role_key}): {comment_text[:30]}...",
            "POST",
            f"tasks/{task_id}/comments",
            200,
            data={"text": comment_text},
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_delete_task(self, role_key, task_id):
        """Test task deletion"""
        success, response = self.run_test(
            f"Delete task ({role_key})",
            "DELETE",
            f"tasks/{task_id}",
            200,
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_create_article(self, role_key, title, content, category="general"):
        """Test article creation"""
        success, response = self.run_test(
            f"Create article ({role_key}): {title}",
            "POST",
            "articles",
            200,
            data={"title": title, "content": content, "category": category},
            token=self.tokens.get(role_key)
        )
        if success and 'id' in response:
            if 'articles' not in self.test_data:
                self.test_data['articles'] = []
            self.test_data['articles'].append(response)
        return success, response

    def test_get_articles(self, role_key):
        """Test get all articles"""
        success, response = self.run_test(
            f"Get all articles ({role_key})",
            "GET",
            "articles",
            200,
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_delete_article(self, role_key, article_id):
        """Test article deletion"""
        success, response = self.run_test(
            f"Delete article ({role_key})",
            "DELETE",
            f"articles/{article_id}",
            200,
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_create_update(self, role_key, title, content, update_type="announcement"):
        """Test company update creation"""
        success, response = self.run_test(
            f"Create update ({role_key}): {title}",
            "POST",
            "updates",
            200 if role_key in ['admin', 'manager'] else 403,
            data={"title": title, "content": content, "type": update_type},
            token=self.tokens.get(role_key)
        )
        if success and 'id' in response:
            if 'updates' not in self.test_data:
                self.test_data['updates'] = []
            self.test_data['updates'].append(response)
        return success, response

    def test_get_updates(self, role_key):
        """Test get all updates"""
        success, response = self.run_test(
            f"Get all updates ({role_key})",
            "GET",
            "updates",
            200,
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_delete_update(self, role_key, update_id):
        """Test update deletion"""
        success, response = self.run_test(
            f"Delete update ({role_key})",
            "DELETE",
            f"updates/{update_id}",
            200 if role_key in ['admin', 'manager'] else 403,
            token=self.tokens.get(role_key)
        )
        return success, response

    def test_get_stats(self, role_key):
        """Test dashboard stats"""
        success, response = self.run_test(
            f"Get dashboard stats ({role_key})",
            "GET",
            "stats",
            200,
            token=self.tokens.get(role_key)
        )
        return success, response

def main():
    print("🚀 Starting Sahub API Testing...")
    tester = SahubAPITester()
    
    # Test data
    timestamp = datetime.now().strftime('%H%M%S')
    test_users = {
        'admin': {
            'name': f'Admin User {timestamp}',
            'email': f'admin{timestamp}@test.com',
            'password': 'TestPass123!',
            'role': 'admin'
        },
        'manager': {
            'name': f'Manager User {timestamp}',
            'email': f'manager{timestamp}@test.com',
            'password': 'TestPass123!',
            'role': 'manager'
        },
        'member': {
            'name': f'Member User {timestamp}',
            'email': f'member{timestamp}@test.com',
            'password': 'TestPass123!',
            'role': 'member'
        }
    }

    print("\n" + "="*50)
    print("AUTHENTICATION TESTS")
    print("="*50)

    # Test user registration for all roles
    for role, user_data in test_users.items():
        success, response = tester.test_user_registration(
            user_data['name'], user_data['email'], user_data['password'], user_data['role']
        )
        if not success:
            print(f"❌ Failed to register {role} user, stopping tests")
            return 1

    # Test login for all users
    for role, user_data in test_users.items():
        success, response = tester.test_user_login(
            user_data['email'], user_data['password'], role
        )
        if not success:
            print(f"❌ Failed to login {role} user")

    # Test get current user
    for role in test_users.keys():
        tester.test_get_me(role)

    # Test get all users
    tester.test_get_users('admin')

    print("\n" + "="*50)
    print("TASK MANAGEMENT TESTS")
    print("="*50)

    # Create tasks with different users
    admin_task_success, admin_task = tester.test_create_task(
        'admin', 
        'Setup project infrastructure', 
        'Configure servers and databases',
        assigned_to=tester.users.get('manager', {}).get('id'),
        priority='high'
    )

    manager_task_success, manager_task = tester.test_create_task(
        'manager',
        'Review team performance',
        'Monthly performance review',
        priority='medium'
    )

    member_task_success, member_task = tester.test_create_task(
        'member',
        'Complete documentation',
        'Update user guides',
        priority='low'
    )

    # Test get all tasks
    tester.test_get_tasks('admin')
    tester.test_get_tasks('member')

    # Test task status updates
    if admin_task_success:
        tester.test_update_task_status('admin', admin_task['id'], 'in_progress')
        tester.test_update_task_status('admin', admin_task['id'], 'completed')

    # Test comments
    if manager_task_success:
        tester.test_add_comment('admin', manager_task['id'], 'Great progress on this task!')
        tester.test_add_comment('manager', manager_task['id'], 'Thanks for the feedback!')

    # Test task deletion
    if member_task_success:
        tester.test_delete_task('member', member_task['id'])

    print("\n" + "="*50)
    print("KNOWLEDGE BASE TESTS")
    print("="*50)

    # Create articles
    admin_article_success, admin_article = tester.test_create_article(
        'admin',
        'Company Policies',
        'This document outlines our company policies and procedures.',
        'guidelines'
    )

    manager_article_success, manager_article = tester.test_create_article(
        'manager',
        'Onboarding Guide',
        'Welcome to the team! Here is your onboarding guide.',
        'onboarding'
    )

    member_article_success, member_article = tester.test_create_article(
        'member',
        'Technical Documentation',
        'API documentation and technical guides.',
        'technical'
    )

    # Test get all articles
    tester.test_get_articles('admin')
    tester.test_get_articles('member')

    # Test article deletion
    if member_article_success:
        tester.test_delete_article('member', member_article['id'])

    print("\n" + "="*50)
    print("COMPANY UPDATES TESTS")
    print("="*50)

    # Test role-based permissions for updates
    admin_update_success, admin_update = tester.test_create_update(
        'admin',
        'New Company Policy',
        'We are implementing new remote work policies.',
        'announcement'
    )

    manager_update_success, manager_update = tester.test_create_update(
        'manager',
        'Team Meeting',
        'Monthly team meeting scheduled for next week.',
        'news'
    )

    # This should fail - members can't create updates
    tester.test_create_update(
        'member',
        'Member Update',
        'This should fail due to permissions.',
        'announcement'
    )

    # Test get all updates
    tester.test_get_updates('admin')
    tester.test_get_updates('member')

    # Test update deletion (role-based)
    if admin_update_success:
        tester.test_delete_update('admin', admin_update['id'])

    # This should fail - members can't delete updates
    if manager_update_success:
        tester.test_delete_update('member', manager_update['id'])

    print("\n" + "="*50)
    print("DASHBOARD STATS TESTS")
    print("="*50)

    # Test dashboard stats
    tester.test_get_stats('admin')
    tester.test_get_stats('manager')
    tester.test_get_stats('member')

    # Print final results
    print("\n" + "="*50)
    print("TEST RESULTS")
    print("="*50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 Excellent! API is working well.")
        return 0
    elif success_rate >= 70:
        print("⚠️  Good, but some issues need attention.")
        return 0
    else:
        print("❌ Multiple issues found. Needs investigation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())