from playwright.sync_api import sync_playwright
import time

def verify_buttons():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 400, 'height': 800}) # Mobile-ish view
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:5173/coffee-tools/coffee_assistant/")
        page.wait_for_load_state("networkidle")

        # Inject data
        js_script = """
            const beans = [{
                id: 'test-bean-1',
                roastery: 'Test Roastery',
                name: 'Visible Bean',
                origin: 'Ethiopia',
                process: 'Washed',
                roastLevel: 'Light',
                notes: 'Test notes'
            }];
            const logs = [{
                id: 'test-log-1',
                beanId: 'test-bean-1',
                brewer: 'V60',
                date: new Date().toISOString(),
                enjoyment: 4.5,
                ratio: '1:16',
                waterTemp: 96,
                technique: 'Pour over',
                extraction: 20
            }];
            localStorage.setItem('coffee_beans', JSON.stringify(beans));
            localStorage.setItem('brew_logs', JSON.stringify(logs));
        """
        page.evaluate(js_script)
        # Reload to pick up local storage
        page.reload()
        page.wait_for_load_state("networkidle")

        # Navigate to Beans
        print("Clicking 'BEANS' nav...")
        page.get_by_text("BEANS").click()
        time.sleep(1) # Wait for view transition
        page.screenshot(path="verification/beans_view.png")
        print("captured verification/beans_view.png")

        # Navigate to History
        print("Clicking 'HISTORY' nav...")
        page.get_by_text("HISTORY").click()
        time.sleep(1)
        page.screenshot(path="verification/history_view.png")
        print("captured verification/history_view.png")

        browser.close()

if __name__ == "__main__":
    verify_buttons()
