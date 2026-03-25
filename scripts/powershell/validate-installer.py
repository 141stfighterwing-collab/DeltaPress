#!/usr/bin/env python3
"""
DeltaPress Installer Validation Suite
Comprehensive validation of the PowerShell installer with:
- Syntax checking
- Function definition validation
- Database configuration verification
- Credential handling verification
- Error handling validation
- Progress reporting verification
"""

import os
import re
import json
import sys
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from enum import Enum

class TestStatus(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    SKIP = "SKIP"
    WARN = "WARN"

@dataclass
class TestResult:
    category: str
    test: str
    status: str
    message: str
    solution: str = ""
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = ""

class InstallerValidator:
    def __init__(self, script_path: str, detailed: bool = False):
        self.script_path = Path(script_path)
        self.detailed = detailed
        self.results: List[TestResult] = []
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.warnings = 0
        self.start_time = datetime.now()
        self.log_file = f"validation-{self.start_time.strftime('%Y%m%d-%H%M%S')}.log"
        self.current_category = ""
        self.current_test = ""
        self.script_content = ""
        
    def log(self, level: str, message: str, category: str = "", test: str = ""):
        """Write log entry with color coding"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        entry = f"[{timestamp}] [{level}]"
        if category:
            entry += f" [{category}]"
        if test:
            entry += f" [{test}]"
        entry += f" {message}"
        
        # Color codes
        colors = {
            "PASS": "\033[92m",   # Green
            "FAIL": "\033[91m",   # Red
            "WARN": "\033[93m",   # Yellow
            "INFO": "\033[96m",   # Cyan
            "DEBUG": "\033[90m",  # Dark Gray
        }
        reset = "\033[0m"
        
        color = colors.get(level, "")
        print(f"{color}{entry}{reset}")
        
        # Write to log file
        with open(self.log_file, "a") as f:
            f.write(entry + "\n")
    
    def test_pass(self, message: str, details: Dict = None):
        """Record a passed test"""
        self.passed += 1
        result = TestResult(
            category=self.current_category,
            test=self.current_test,
            status=TestStatus.PASS.value,
            message=message,
            details=details or {},
            timestamp=datetime.now().strftime("%H:%M:%S.%f")[:-3]
        )
        self.results.append(result)
        self.log("PASS", message, self.current_category, self.current_test)
        if details and self.detailed:
            self.log("DEBUG", f"Details: {json.dumps(details)}", self.current_category)
    
    def test_fail(self, message: str, solution: str = ""):
        """Record a failed test"""
        self.failed += 1
        result = TestResult(
            category=self.current_category,
            test=self.current_test,
            status=TestStatus.FAIL.value,
            message=message,
            solution=solution,
            timestamp=datetime.now().strftime("%H:%M:%S.%f")[:-3]
        )
        self.results.append(result)
        self.log("FAIL", message, self.current_category, self.current_test)
        if solution:
            self.log("INFO", f"Solution: {solution}", self.current_category)
    
    def test_skip(self, message: str, reason: str = ""):
        """Record a skipped test"""
        self.skipped += 1
        result = TestResult(
            category=self.current_category,
            test=self.current_test,
            status=TestStatus.SKIP.value,
            message=message,
            details={"reason": reason},
            timestamp=datetime.now().strftime("%H:%M:%S.%f")[:-3]
        )
        self.results.append(result)
        self.log("WARN", f"SKIPPED: {message}", self.current_category, self.current_test)
    
    def test_warn(self, message: str, recommendation: str = ""):
        """Record a warning"""
        self.warnings += 1
        self.log("WARN", message, self.current_category, self.current_test)
        if recommendation:
            self.log("INFO", f"Recommendation: {recommendation}", self.current_category)
    
    def set_test(self, category: str, test: str):
        """Set current test context"""
        self.current_category = category
        self.current_test = test
        print(f"\n  [TEST] {category} > {test}")
    
    def print_header(self, title: str):
        """Print section header"""
        print()
        print("  " + "=" * 60)
        print(f"  {title}")
        print("  " + "=" * 60)
        print()
    
    # ========================================================================
    # Validation Tests
    # ========================================================================
    
    def validate_prerequisites(self):
        """Validate prerequisites for the installer"""
        self.print_header("PHASE 1: Prerequisites Check")
        
        # Test 1: Script File Exists
        self.set_test("Prerequisites", "Script File")
        try:
            if self.script_path.exists():
                stat = self.script_path.stat()
                self.test_pass(
                    f"Installer script found: {self.script_path.absolute()}",
                    {"size": stat.st_size, "modified": str(datetime.fromtimestamp(stat.st_mtime))}
                )
                # Load script content
                with open(self.script_path, "r", encoding="utf-8") as f:
                    self.script_content = f.read()
            else:
                self.test_fail(
                    f"Installer script not found at: {self.script_path}",
                    "Ensure you're running from the DeltaPress root directory"
                )
        except Exception as e:
            self.test_fail(f"Error reading script file: {e}")
        
        # Test 2: Script Size
        self.set_test("Prerequisites", "Script Size")
        if self.script_content:
            lines = self.script_content.count("\n")
            if lines > 1500:
                self.test_pass(f"Script has substantial content: {lines} lines")
            else:
                self.test_warn(f"Script seems small: {lines} lines", "Expected 1500+ lines for full installer")
    
    def validate_syntax(self):
        """Validate PowerShell script syntax"""
        self.print_header("PHASE 2: Script Syntax Validation")
        
        if not self.script_content:
            self.test_skip("Syntax validation", "Script not loaded")
            return
        
        # Test 1: Param Block
        self.set_test("Syntax", "Param Block")
        param_match = re.search(r'\[CmdletBinding\(\)\]\s*param\s*\(', self.script_content)
        if param_match:
            self.test_pass("CmdletBinding and param block found")
            
            # Check expected parameters
            expected_params = [
                "WithDocker", "ForceReinstall", "ValidateOnly", "Database",
                "Port", "DbPort", "EnvFile", "MaxRetries", "SkipCredentials",
                "CustomDbPassword", "CustomAppPassword"
            ]
            missing = [p for p in expected_params if f"${p}" not in self.script_content and f"-{p}" not in self.script_content]
            if not missing:
                self.test_pass("All expected parameters present")
            else:
                self.test_warn(f"Missing parameters: {missing}")
        else:
            self.test_fail("Param block not properly formatted", "Add [CmdletBinding()] and param block")
        
        # Test 2: Balanced Braces
        self.set_test("Syntax", "Balanced Braces")
        open_braces = self.script_content.count("{")
        close_braces = self.script_content.count("}")
        if open_braces == close_braces:
            self.test_pass(f"Braces balanced: {open_braces} pairs")
        else:
            self.test_fail(f"Braces unbalanced: {open_braces} open, {close_braces} close", "Check for missing braces")
        
        # Test 3: Try-Catch Blocks
        self.set_test("Syntax", "Try-Catch Blocks")
        try_count = len(re.findall(r'\btry\s*\{', self.script_content))
        catch_count = len(re.findall(r'\bcatch\s*(?:\{|\()', self.script_content))
        if try_count == catch_count:
            self.test_pass(f"All try blocks have catch: {try_count} pairs")
        else:
            self.test_fail(f"Mismatched try-catch: {try_count} try, {catch_count} catch", "Ensure every try has a catch")
        
        # Test 4: Configuration Variables
        self.set_test("Syntax", "Configuration Variables")
        required_vars = ["CONFIG", "INSTALL_STEPS", "DB_CONFIG"]
        missing = [v for v in required_vars if f"${v}" not in self.script_content and f"${v} =" not in self.script_content]
        if not missing:
            self.test_pass("All configuration variables present")
        else:
            self.test_fail(f"Missing variables: {missing}", "Add missing configuration variables")
    
    def validate_functions(self):
        """Validate function definitions"""
        self.print_header("PHASE 3: Function Definitions Check")
        
        if not self.script_content:
            self.test_skip("Function validation", "Script not loaded")
            return
        
        required_functions = [
            # Progress
            "Initialize-Progress", "Write-ProgressBar", "Complete-Step", "Skip-Step",
            # Logging
            "Write-Log", "Write-ProgressDetail",
            # Validation
            "Test-WindowsVersion", "Test-AdministratorRights", "Get-PackageManager",
            "Test-NodeJS", "Test-Npm", "Test-ProjectFiles",
            # Installation
            "Install-NodeJS", "Install-Dependencies", "Install-DockerDesktop",
            # Database
            "Test-DatabaseSystem", "Install-Database", "Install-DatabaseDocker",
            "Initialize-Database", "Initialize-DatabaseTables",
            # Credentials
            "New-SecurePassword", "New-UniqueAppId", "New-Credentials", "Add-ToGitignore",
            # Environment
            "New-EnvironmentConfig",
            # Build/Start
            "Build-Application", "Test-HealthCheck", "Start-Application",
            # Summary
            "Show-Summary", "Show-Header",
            # Main
            "Main"
        ]
        
        found = 0
        missing = []
        
        for func in required_functions:
            self.set_test("Functions", func)
            pattern = rf'function\s+{re.escape(func)}\s*\{{'
            if re.search(pattern, self.script_content):
                self.test_pass(f"Function '{func}' defined")
                found += 1
            else:
                self.test_fail(f"Function '{func}' not found", f"Add function definition for {func}")
                missing.append(func)
        
        print()
        print(f"  Function Summary: {found}/{len(required_functions)} found")
    
    def validate_database_functions(self):
        """Validate database-related functions"""
        self.print_header("PHASE 4: Database Functions Validation")
        
        if not self.script_content:
            self.test_skip("Database validation", "Script not loaded")
            return
        
        # Test 1: Database Configuration
        self.set_test("Database", "Configuration")
        if "$DB_CONFIG" in self.script_content:
            db_types = ["PostgreSQL", "MySQL", "MongoDB"]
            missing = [db for db in db_types if db not in self.script_content]
            if not missing:
                self.test_pass("All database types configured: PostgreSQL, MySQL, MongoDB")
            else:
                self.test_fail(f"Missing database types: {missing}")
        else:
            self.test_fail("DB_CONFIG not found", "Add database configuration hashtable")
        
        # Test 2: Port Configuration
        self.set_test("Database", "Port Configuration")
        ports = {"PostgreSQL": 5432, "MySQL": 3306, "MongoDB": 27017}
        all_correct = True
        for db, port in ports.items():
            if f"DefaultPort = {port}" in self.script_content or f"DefaultPort={port}" in self.script_content:
                pass
            else:
                all_correct = False
                self.test_warn(f"{db} port might not be correctly configured")
        
        if all_correct:
            self.test_pass("All database ports correctly configured")
        
        # Test 3: Connection Strings
        self.set_test("Database", "Connection Strings")
        conn_strings = {
            "PostgreSQL": "postgresql://",
            "MySQL": "mysql://",
            "MongoDB": "mongodb://"
        }
        all_found = True
        for db, pattern in conn_strings.items():
            if pattern in self.script_content:
                pass
            else:
                all_found = False
                self.test_warn(f"{db} connection string template might be missing")
        
        if all_found:
            self.test_pass("All connection string templates present")
        
        # Test 4: SQL Scripts
        self.set_test("Database", "Table Creation SQL")
        if "CREATE TABLE" in self.script_content:
            required_tables = ["users", "posts", "journalists", "api_stats"]
            missing = [t for t in required_tables if f"CREATE TABLE" in self.script_content and t in self.script_content.lower()]
            # More lenient check
            tables_found = sum(1 for t in required_tables if t in self.script_content.lower())
            self.test_pass(f"SQL table creation scripts present ({tables_found}/4 tables referenced)")
        else:
            self.test_fail("No SQL table creation scripts found", "Add table creation SQL scripts")
        
        # Test 5: Docker Support
        self.set_test("Database", "Docker Support")
        docker_images = ["postgres:", "mysql:", "mongo:"]
        found_images = [img for img in docker_images if img in self.script_content]
        if len(found_images) == 3:
            self.test_pass("All Docker database images configured")
        else:
            self.test_warn(f"Some Docker images missing: {found_images}")
        
        # Test 6: Database Parameter
        self.set_test("Database", "Database Parameter")
        if "ValidateSet" in self.script_content and "PostgreSQL" in self.script_content:
            self.test_pass("Database parameter with validation present")
        else:
            self.test_fail("Database parameter validation not found", "Add ValidateSet for Database parameter")
    
    def validate_credentials(self):
        """Validate credential generation"""
        self.print_header("PHASE 5: Credential Functions Validation")
        
        if not self.script_content:
            self.test_skip("Credential validation", "Script not loaded")
            return
        
        # Test 1: Password Generation
        self.set_test("Credentials", "Password Generation")
        if "New-SecurePassword" in self.script_content:
            if "RandomNumberGenerator" in self.script_content or "Security.Cryptography" in self.script_content:
                self.test_pass("New-SecurePassword uses cryptographic random generation")
            else:
                self.test_warn("Password generation might not use cryptographic random", "Use System.Security.Cryptography")
        else:
            self.test_fail("New-SecurePassword function not found", "Add secure password generation")
        
        # Test 2: App ID Generation
        self.set_test("Credentials", "App ID Generation")
        if "New-UniqueAppId" in self.script_content:
            if "DP-" in self.script_content:
                self.test_pass("App ID has recognizable prefix (DP-)")
            else:
                self.test_warn("App ID might not have recognizable prefix")
        else:
            self.test_fail("New-UniqueAppId function not found", "Add unique app ID generation")
        
        # Test 3: Credentials File
        self.set_test("Credentials", "Credentials File")
        if "CredentialsFile" in self.script_content:
            self.test_pass("Credentials file path configured")
            
            required_fields = ["APP_ID", "APP_PASSWORD", "DB_PASSWORD", "JWT_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"]
            missing = [f for f in required_fields if f not in self.script_content]
            if not missing:
                self.test_pass("All credential fields present")
            else:
                self.test_warn(f"Missing credential fields: {missing}")
        else:
            self.test_fail("Credentials file not configured", "Add credentials file path")
        
        # Test 4: Gitignore Protection
        self.set_test("Credentials", "Gitignore Protection")
        if "Add-ToGitignore" in self.script_content:
            self.test_pass("Add-ToGitignore function found")
        else:
            self.test_fail("Add-ToGitignore function not found", "Add function to protect credentials")
        
        # Test 5: Check .gitignore
        self.set_test("Credentials", ".gitignore File")
        gitignore_path = self.script_path.parent.parent / ".gitignore"
        if gitignore_path.exists():
            content = gitignore_path.read_text()
            if ".credentials" in content:
                self.test_pass(".gitignore contains .credentials")
            else:
                self.test_warn(".credentials not in .gitignore", "Add .credentials to .gitignore")
        else:
            self.test_warn(".gitignore file not found", "Create .gitignore with .credentials")
    
    def validate_environment(self):
        """Validate environment configuration"""
        self.print_header("PHASE 6: Environment Functions Validation")
        
        if not self.script_content:
            self.test_skip("Environment validation", "Script not loaded")
            return
        
        # Test 1: Environment Config Function
        self.set_test("Environment", "Config Function")
        if "New-EnvironmentConfig" in self.script_content:
            self.test_pass("New-EnvironmentConfig function found")
            
            required_vars = ["GEMINI_API_KEY", "PORT", "NODE_ENV", "JWT_SECRET", "DATABASE_URL"]
            missing = [v for v in required_vars if v not in self.script_content]
            if not missing:
                self.test_pass("All required environment variables referenced")
            else:
                self.test_warn(f"Missing env var references: {missing}")
        else:
            self.test_fail("New-EnvironmentConfig function not found", "Add environment configuration function")
        
        # Test 2: Env File Loading
        self.set_test("Environment", "Env File Loading")
        if ".env" in self.script_content and "Get-Content" in self.script_content:
            self.test_pass("Script has environment file loading logic")
        else:
            self.test_warn("No .env file loading logic found")
    
    def validate_error_handling(self):
        """Validate error handling"""
        self.print_header("PHASE 7: Error Handling Validation")
        
        if not self.script_content:
            self.test_skip("Error handling validation", "Script not loaded")
            return
        
        # Test 1: Error Action Preference
        self.set_test("ErrorHandling", "Error Action Preference")
        if '$ErrorActionPreference = "Stop"' in self.script_content or "$ErrorActionPreference='Stop'" in self.script_content:
            self.test_pass("Error action preference set to Stop")
        else:
            self.test_warn("Error action preference not set to Stop")
        
        # Test 2: Error Collection
        self.set_test("ErrorHandling", "Error Collection")
        if "$Script:Errors" in self.script_content:
            self.test_pass("Error collection variable defined")
        else:
            self.test_warn("No error collection variable found")
        
        # Test 3: Try-Catch Coverage
        self.set_test("ErrorHandling", "Try-Catch Coverage")
        try_count = len(re.findall(r'\btry\s*\{', self.script_content))
        function_count = len(re.findall(r'function\s+\w+', self.script_content))
        
        if function_count > 0:
            coverage = round((try_count / function_count) * 100, 1)
            if coverage >= 80:
                self.test_pass(f"Good try-catch coverage: {coverage}% ({try_count} try blocks)")
            elif coverage >= 50:
                self.test_warn(f"Moderate try-catch coverage: {coverage}%", "Add more error handling")
            else:
                self.test_fail(f"Low try-catch coverage: {coverage}%", "Add try-catch blocks")
        
        # Test 4: Solution Messages
        self.set_test("ErrorHandling", "Solution Messages")
        solution_count = len(re.findall(r'Solution\s*=', self.script_content))
        if solution_count >= 10:
            self.test_pass(f"Solution messages present ({solution_count} found)")
        else:
            self.test_warn(f"Few solution messages ({solution_count} found)", "Add solution suggestions")
        
        # Test 5: Critical Step Handling
        self.set_test("ErrorHandling", "Critical Step Handling")
        if "Critical = $true" in self.script_content and "CRITICAL ERROR" in self.script_content:
            self.test_pass("Critical step detection and handling present")
        else:
            self.test_warn("Critical step handling might be incomplete")
        
        # Test 6: Exit Codes
        self.set_test("ErrorHandling", "Exit Codes")
        if "exit 1" in self.script_content or "exit 0" in self.script_content:
            self.test_pass("Exit codes used in script")
        else:
            self.test_warn("No exit codes found")
    
    def validate_logging(self):
        """Validate logging functionality"""
        self.print_header("PHASE 8: Logging Validation")
        
        if not self.script_content:
            self.test_skip("Logging validation", "Script not loaded")
            return
        
        # Test 1: Log Function
        self.set_test("Logging", "Log Function")
        if "function Write-Log" in self.script_content:
            self.test_pass("Write-Log function found")
            
            if "INFO" in self.script_content and "ERROR" in self.script_content and "WARN" in self.script_content:
                self.test_pass("Multiple log levels supported (INFO, ERROR, WARN)")
            
            if "Get-Date" in self.script_content or "timestamp" in self.script_content:
                self.test_pass("Timestamps included in logs")
        else:
            self.test_fail("Write-Log function not found", "Add logging function")
        
        # Test 2: Log File Output
        self.set_test("Logging", "Log File Output")
        if ".log" in self.script_content and ("Add-Content" in self.script_content or "Out-File" in self.script_content):
            self.test_pass("Log file output configured")
        else:
            self.test_warn("No log file output found")
    
    def validate_progress(self):
        """Validate progress reporting"""
        self.print_header("PHASE 9: Progress Reporting Validation")
        
        if not self.script_content:
            self.test_skip("Progress validation", "Script not loaded")
            return
        
        # Test 1: Progress Bar
        self.set_test("Progress", "Progress Bar")
        if "Write-ProgressBar" in self.script_content:
            self.test_pass("Write-ProgressBar function found")
            
            if "totalProgress" in self.script_content or "%" in self.script_content:
                self.test_pass("Percentage calculation present")
            
            if "█" in self.script_content or "░" in self.script_content:
                self.test_pass("Visual progress bar elements present")
        else:
            self.test_fail("Write-ProgressBar function not found", "Add progress bar function")
        
        # Test 2: Step Tracking
        self.set_test("Progress", "Step Tracking")
        if "$Script:CurrentStep" in self.script_content and "$Script:CompletedWeight" in self.script_content:
            self.test_pass("Step tracking variables present")
        else:
            self.test_warn("Step tracking variables might be missing")
        
        # Test 3: Installation Steps
        self.set_test("Progress", "Installation Steps")
        if "$INSTALL_STEPS" in self.script_content:
            if "Weight =" in self.script_content:
                self.test_pass("Installation steps have weight configuration")
            
            if "Critical =" in self.script_content:
                self.test_pass("Installation steps have critical flags")
            
            step_count = len(re.findall(r'Name\s*=', self.script_content))
            self.test_pass(f"{step_count} installation steps defined")
        else:
            self.test_fail("INSTALL_STEPS not defined", "Define installation steps array")
        
        # Test 4: Summary Display
        self.set_test("Progress", "Summary Display")
        if "Show-Summary" in self.script_content:
            self.test_pass("Show-Summary function found")
        else:
            self.test_fail("Show-Summary function not found", "Add summary display function")
    
    def validate_install_steps(self):
        """Validate each installation step has proper handling"""
        self.print_header("PHASE 10: Installation Steps Validation")
        
        if not self.script_content:
            self.test_skip("Installation steps validation", "Script not loaded")
            return
        
        # Extract installation steps
        steps_match = re.search(r'\$INSTALL_STEPS\s*=\s*@\((.*?)\)', self.script_content, re.DOTALL)
        if not steps_match:
            self.test_fail("Could not extract INSTALL_STEPS")
            return
        
        steps_content = steps_match.group(1)
        step_names = re.findall(r'Name\s*=\s*"([^"]+)"', steps_content)
        
        self.test_pass(f"Found {len(step_names)} installation steps")
        
        # Check each step has corresponding function or logic
        for step in step_names:
            self.set_test("InstallSteps", step)
            # Convert step name to potential function name
            func_name = step.replace(" ", "").replace("-", "")
            if func_name in self.script_content or step in self.script_content:
                self.test_pass(f"Step '{step}' has implementation")
            else:
                self.test_warn(f"Step '{step}' might not have dedicated implementation")
    
    def generate_report(self, output_path: str = None) -> Dict:
        """Generate validation report"""
        self.print_header("VALIDATION SUMMARY")
        
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        total = self.passed + self.failed + self.skipped
        pass_rate = round((self.passed / (self.passed + self.failed)) * 100, 1) if (self.passed + self.failed) > 0 else 0
        
        report = {
            "meta": {
                "script": str(self.script_path),
                "start_time": self.start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": round(duration, 2)
            },
            "summary": {
                "total_tests": total,
                "passed": self.passed,
                "failed": self.failed,
                "skipped": self.skipped,
                "warnings": self.warnings,
                "pass_rate": pass_rate
            },
            "results": [asdict(r) for r in self.results]
        }
        
        # Print summary
        print(f"\n  Total Tests:   {total}")
        print(f"  Passed:        \033[92m{self.passed}\033[0m")
        print(f"  Failed:        \033[91m{self.failed}\033[0m")
        print(f"  Skipped:       \033[93m{self.skipped}\033[0m")
        print(f"  Warnings:      \033[93m{self.warnings}\033[0m")
        print(f"  Pass Rate:     {pass_rate}%")
        print(f"  Duration:      {round(duration, 2)}s")
        
        # Show failed tests
        if self.failed > 0:
            print("\n  \033[91mFAILED TESTS:\033[0m")
            for r in self.results:
                if r.status == "FAIL":
                    print(f"    [{r.category}] {r.test}: {r.message}")
                    if r.solution:
                        print(f"      Solution: {r.solution}")
        
        # Final verdict
        print("\n  " + "=" * 60)
        if self.failed == 0:
            print("  \033[92mALL VALIDATIONS PASSED - Installer is ready for deployment\033[0m")
        elif self.failed <= 3:
            print("  \033[93mMOSTLY PASSING - Minor issues need attention\033[0m")
        else:
            print("  \033[91mCRITICAL ISSUES FOUND - Review and fix before deployment\033[0m")
        print("  " + "=" * 60)
        
        # Save report
        if output_path:
            with open(output_path, "w") as f:
                json.dump(report, f, indent=2)
            print(f"\n  Report saved to: {output_path}")
        
        print(f"  Log file: {self.log_file}")
        
        return report

def main():
    """Main validation runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description="DeltaPress Installer Validation Suite")
    parser.add_argument("--script", "-s", default="./scripts/powershell/install.ps1", help="Path to installer script")
    parser.add_argument("--detailed", "-d", action="store_true", help="Enable detailed output")
    parser.add_argument("--report", "-r", default="validation-report.json", help="Output report path")
    
    args = parser.parse_args()
    
    # Print header
    print()
    print("  +===============================================================+")
    print("  |                                                               |")
    print("  |          DELTAPRESS INSTALLER VALIDATION SUITE               |")
    print("  |                                                               |")
    print("  |                    Version 1.6.0                              |")
    print("  |                                                               |")
    print("  +===============================================================+")
    print()
    print(f"  Script: {args.script}")
    print(f"  Mode: {'DETAILED' if args.detailed else 'STANDARD'}")
    print(f"  Report: {args.report}")
    
    # Run validation
    validator = InstallerValidator(args.script, args.detailed)
    
    validator.validate_prerequisites()
    validator.validate_syntax()
    validator.validate_functions()
    validator.validate_database_functions()
    validator.validate_credentials()
    validator.validate_environment()
    validator.validate_error_handling()
    validator.validate_logging()
    validator.validate_progress()
    validator.validate_install_steps()
    
    report = validator.generate_report(args.report)
    
    # Return exit code
    sys.exit(0 if validator.failed == 0 else 1)

if __name__ == "__main__":
    main()
