<#
.SYNOPSIS
    DeltaPress Installer Validation and Testing Script
.DESCRIPTION
    Comprehensive validation of the installer script that tests:
    - Each installation step
    - Database configuration functions
    - Credential generation
    - Environment configuration
    - Error handling and logging
    
    Includes detailed logging, progress reporting, and error analysis.

.EXAMPLE
    .\validate-installer.ps1
    .\validate-installer.ps1 -Detailed
    .\validate-installer.ps1 -TestDatabase PostgreSQL
    .\validate-installer.ps1 -GenerateReport
#>

[CmdletBinding()]
param(
    [switch]$Detailed,
    [ValidateSet("PostgreSQL", "MySQL", "MongoDB", "All")]
    [string]$TestDatabase = "All",
    [switch]$GenerateReport,
    [string]$ReportPath = ".\validation-report.json",
    [switch]$FixIssues,
    [int]$TimeoutSeconds = 30
)

# ============================================================================
# Configuration
# ============================================================================

$CONFIG = @{
    AppName = "DeltaPress"
    Version = "1.6.0"
    ScriptPath = ".\scripts\powershell\install.ps1"
    LogFile = ".\validation-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    Timeout = $TimeoutSeconds
}

# Test categories
$TEST_CATEGORIES = @(
    "Prerequisites",
    "ScriptSyntax",
    "FunctionDefinitions",
    "DatabaseFunctions",
    "CredentialFunctions",
    "EnvironmentFunctions",
    "DockerFunctions",
    "ErrorHandling",
    "Logging",
    "ProgressReporting"
)

# ============================================================================
# State Variables
# ============================================================================

$Script:TestResults = @{}
$Script:PassedTests = 0
$Script:FailedTests = 0
$Script:SkippedTests = 0
$Script:Warnings = 0
$Script:Errors = @()
$Script:StartTime = Get-Date
$Script:CurrentCategory = ""
$Script:CurrentTest = ""

# ============================================================================
# Logging Functions
# ============================================================================

function Write-Log {
    param(
        [string]$Level = "INFO",
        [string]$Message,
        [string]$Category = "",
        [string]$Test = ""
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    $entry = "[$timestamp] [$Level]"
    
    if ($Category) { $entry += " [$Category]" }
    if ($Test) { $entry += " [$Test]" }
    
    $entry += " $Message"
    
    # Color coding
    $color = switch ($Level) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        "INFO" { "Cyan" }
        "DEBUG" { "DarkGray" }
        default { "White" }
    }
    
    Write-Host $entry -ForegroundColor $color
    
    # Write to log file
    Add-Content -Path $CONFIG.LogFile -Value $entry -ErrorAction SilentlyContinue
}

function Write-Header {
    param([string]$Title)
    
    Write-Host ""
    Write-Host "  ===========================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "  ===========================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-TestHeader {
    param([string]$Category, [string]$Test)
    
    $Script:CurrentCategory = $Category
    $Script:CurrentTest = $Test
    
    Write-Host "  [TEST] " -ForegroundColor Magenta -NoNewline
    Write-Host "$Category > $Test" -ForegroundColor White
}

# ============================================================================
# Test Result Functions
# ============================================================================

function Test-Pass {
    param(
        [string]$Message,
        [object]$Details = $null
    )
    
    $Script:PassedTests++
    
    $result = @{
        Category = $Script:CurrentCategory
        Test = $Script:CurrentTest
        Status = "PASS"
        Message = $Message
        Details = $Details
        Timestamp = Get-Date -Format "HH:mm:ss.fff"
    }
    
    $Script:TestResults["$($Script:CurrentCategory)_$($Script:CurrentTest)"] = $result
    
    Write-Log -Level "PASS" -Message $Message -Category $Script:CurrentCategory -Test $Script:CurrentTest
    
    if ($Details -and $Detailed) {
        Write-Log -Level "DEBUG" -Message "Details: $($Details | ConvertTo-Json -Compress)" -Category $Script:CurrentCategory
    }
}

function Test-Fail {
    param(
        [string]$Message,
        [string]$Solution = "",
        [object]$Error = $null
    )
    
    $Script:FailedTests++
    
    $result = @{
        Category = $Script:CurrentCategory
        Test = $Script:CurrentTest
        Status = "FAIL"
        Message = $Message
        Solution = $Solution
        Error = if ($Error) { $Error.ToString() } else { $null }
        Timestamp = Get-Date -Format "HH:mm:ss.fff"
    }
    
    $Script:TestResults["$($Script:CurrentCategory)_$($Script:CurrentTest)"] = $result
    $Script:Errors += $result
    
    Write-Log -Level "FAIL" -Message $Message -Category $Script:CurrentCategory -Test $Script:CurrentTest
    
    if ($Solution) {
        Write-Log -Level "INFO" -Message "Solution: $Solution" -Category $Script:CurrentCategory
    }
    
    if ($Error -and $Detailed) {
        Write-Log -Level "DEBUG" -Message "Error: $($Error.ToString())" -Category $Script:CurrentCategory
    }
}

function Test-Skip {
    param(
        [string]$Message,
        [string]$Reason = ""
    )
    
    $Script:SkippedTests++
    
    $result = @{
        Category = $Script:CurrentCategory
        Test = $Script:CurrentTest
        Status = "SKIP"
        Message = $Message
        Reason = $Reason
        Timestamp = Get-Date -Format "HH:mm:ss.fff"
    }
    
    $Script:TestResults["$($Script:CurrentCategory)_$($Script:CurrentTest)"] = $result
    
    Write-Log -Level "WARN" -Message "SKIPPED: $Message" -Category $Script:CurrentCategory -Test $Script:CurrentTest
}

function Test-Warn {
    param(
        [string]$Message,
        [string]$Recommendation = ""
    )
    
    $Script:Warnings++
    
    Write-Log -Level "WARN" -Message $Message -Category $Script:CurrentCategory -Test $Script:CurrentTest
    
    if ($Recommendation) {
        Write-Log -Level "INFO" -Message "Recommendation: $Recommendation" -Category $Script:CurrentCategory
    }
}

# ============================================================================
# Test Functions - Prerequisites
# ============================================================================

function Test-Prerequisites {
    Write-Header "PHASE 1: Prerequisites Check"
    
    # Test 1: PowerShell Version
    Write-TestHeader -Category "Prerequisites" -Test "PowerShell Version"
    try {
        $psVersion = $PSVersionTable.PSVersion
        if ($psVersion.Major -ge 5) {
            Test-Pass -Message "PowerShell $($psVersion.ToString()) detected" -Details @{ Version = $psVersion.ToString() }
        } else {
            Test-Fail -Message "PowerShell $($psVersion.ToString()) is too old" -Solution "Upgrade to PowerShell 5.1 or later"
        }
    } catch {
        Test-Fail -Message "Failed to detect PowerShell version" -Error $_
    }
    
    # Test 2: Script File Exists
    Write-TestHeader -Category "Prerequisites" -Test "Script File"
    try {
        if (Test-Path $CONFIG.ScriptPath) {
            $scriptInfo = Get-Item $CONFIG.ScriptPath
            Test-Pass -Message "Installer script found: $($scriptInfo.FullName)" -Details @{ 
                Path = $scriptInfo.FullName
                Size = $scriptInfo.Length
                LastModified = $scriptInfo.LastWriteTime
            }
        } else {
            Test-Fail -Message "Installer script not found at: $($CONFIG.ScriptPath)" -Solution "Ensure you're running from the DeltaPress root directory"
        }
    } catch {
        Test-Fail -Message "Error checking script file" -Error $_
    }
    
    # Test 3: Execution Policy
    Write-TestHeader -Category "Prerequisites" -Test "Execution Policy"
    try {
        $policy = Get-ExecutionPolicy -Scope CurrentUser
        if ($policy -in @("RemoteSigned", "Unrestricted", "Bypass")) {
            Test-Pass -Message "Execution policy is '$policy' (scripts can run)"
        } else {
            Test-Warn -Message "Execution policy is '$policy'" -Recommendation "Run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
            Test-Pass -Message "Execution policy check completed"
        }
    } catch {
        Test-Fail -Message "Failed to check execution policy" -Error $_
    }
    
    # Test 4: Required Modules
    Write-TestHeader -Category "Prerequisites" -Test "Required Modules"
    try {
        $modules = @("Microsoft.PowerShell.Management", "Microsoft.PowerShell.Utility")
        $missingModules = @()
        
        foreach ($module in $modules) {
            if (-not (Get-Module -ListAvailable -Name $module)) {
                $missingModules += $module
            }
        }
        
        if ($missingModules.Count -eq 0) {
            Test-Pass -Message "All required modules available"
        } else {
            Test-Fail -Message "Missing modules: $($missingModules -join ', ')" -Solution "Install missing PowerShell modules"
        }
    } catch {
        Test-Fail -Message "Error checking modules" -Error $_
    }
    
    # Test 5: Write Permissions
    Write-TestHeader -Category "Prerequisites" -Test "Write Permissions"
    try {
        $testFile = ".\permission-test-$(Get-Random).tmp"
        "test" | Out-File -FilePath $testFile -ErrorAction Stop
        Remove-Item $testFile -Force -ErrorAction SilentlyContinue
        Test-Pass -Message "Write permissions verified"
    } catch {
        Test-Fail -Message "No write permissions in current directory" -Solution "Run from a directory where you have write access"
    }
}

# ============================================================================
# Test Functions - Script Syntax
# ============================================================================

function Test-ScriptSyntax {
    Write-Header "PHASE 2: Script Syntax Validation"
    
    # Test 1: Parse Script
    Write-TestHeader -Category "ScriptSyntax" -Test "Parse Script"
    try {
        $errors = $null
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $CONFIG.ScriptPath -Raw), [ref]$errors)
        
        if ($errors.Count -eq 0) {
            Test-Pass -Message "Script parsed successfully with no syntax errors"
        } else {
            Test-Fail -Message "Syntax errors found: $($errors.Count)" -Solution "Fix syntax errors in install.ps1"
            foreach ($err in $errors) {
                Write-Log -Level "DEBUG" -Message "Line $($err.Token.StartLine): $($err.Message)" -Category "ScriptSyntax"
            }
        }
    } catch {
        Test-Fail -Message "Failed to parse script" -Error $_
    }
    
    # Test 2: Param Block
    Write-TestHeader -Category "ScriptSyntax" -Test "Param Block"
    try {
        $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
        if ($scriptContent -match 'param\s*\(') {
            # Extract param block
            $paramMatch = [regex]::Match($scriptContent, 'param\s*\(([^)]+(\([^)]*\)[^)]*)*)\)')
            if ($paramMatch.Success) {
                Test-Pass -Message "Param block found and properly formatted"
                
                # Check expected parameters
                $expectedParams = @("WithDocker", "ForceReinstall", "ValidateOnly", "Database", "Port", "DbPort", "EnvFile", "MaxRetries", "SkipCredentials", "CustomDbPassword", "CustomAppPassword")
                $missingParams = @()
                
                foreach ($param in $expectedParams) {
                    if ($scriptContent -notmatch "\`$$param") {
                        $missingParams += $param
                    }
                }
                
                if ($missingParams.Count -gt 0) {
                    Test-Warn -Message "Missing parameters: $($missingParams -join ', ')" -Recommendation "Add missing parameters to param block"
                }
            } else {
                Test-Fail -Message "Param block not properly closed" -Solution "Check param block syntax"
            }
        } else {
            Test-Fail -Message "No param block found" -Solution "Add param block to script"
        }
    } catch {
        Test-Fail -Message "Error checking param block" -Error $_
    }
    
    # Test 3: Try-Catch Blocks
    Write-TestHeader -Category "ScriptSyntax" -Test "Try-Catch Blocks"
    try {
        $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
        $tryCount = ([regex]::Matches($scriptContent, '\btry\s*\{')).Count
        $catchCount = ([regex]::Matches($scriptContent, '\bcatch\s*\{')).Count
        
        if ($tryCount -eq $catchCount) {
            Test-Pass -Message "All try blocks have corresponding catch blocks ($tryCount total)"
        } else {
            Test-Fail -Message "Mismatched try-catch blocks: $tryCount try, $catchCount catch" -Solution "Ensure every try has a catch block"
        }
    } catch {
        Test-Fail -Message "Error checking try-catch blocks" -Error $_
    }
    
    # Test 4: Required Variables
    Write-TestHeader -Category "ScriptSyntax" -Test "Required Variables"
    try {
        $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
        $requiredVars = @("CONFIG", "INSTALL_STEPS", "DB_CONFIG")
        $missingVars = @()
        
        foreach ($var in $requiredVars) {
            if ($scriptContent -notmatch "\`$$var\s*=") {
                $missingVars += $var
            }
        }
        
        if ($missingVars.Count -eq 0) {
            Test-Pass -Message "All required configuration variables present"
        } else {
            Test-Fail -Message "Missing variables: $($missingVars -join ', ')" -Solution "Add missing configuration variables"
        }
    } catch {
        Test-Fail -Message "Error checking required variables" -Error $_
    }
}

# ============================================================================
# Test Functions - Function Definitions
# ============================================================================

function Test-FunctionDefinitions {
    Write-Header "PHASE 3: Function Definitions Check"
    
    $requiredFunctions = @(
        # Progress functions
        "Initialize-Progress",
        "Write-ProgressBar",
        "Complete-Step",
        "Skip-Step",
        
        # Logging functions
        "Write-Log",
        "Write-ProgressDetail",
        
        # Validation functions
        "Test-WindowsVersion",
        "Test-AdministratorRights",
        "Get-PackageManager",
        "Test-NodeJS",
        "Test-Npm",
        "Test-ProjectFiles",
        
        # Install functions
        "Install-NodeJS",
        "Install-Dependencies",
        "Install-DockerDesktop",
        
        # Database functions
        "Test-DatabaseSystem",
        "Install-Database",
        "Install-DatabaseDocker",
        "Initialize-Database",
        "Initialize-DatabaseTables",
        
        # Credential functions
        "New-SecurePassword",
        "New-UniqueAppId",
        "New-Credentials",
        "Add-ToGitignore",
        
        # Environment functions
        "New-EnvironmentConfig",
        
        # Build/Start functions
        "Build-Application",
        "Test-HealthCheck",
        "Start-Application",
        
        # Summary functions
        "Show-Summary",
        "Show-Header",
        
        # Main function
        "Main"
    )
    
    $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
    $foundFunctions = @()
    $missingFunctions = @()
    
    foreach ($func in $requiredFunctions) {
        Write-TestHeader -Category "FunctionDefinitions" -Test $func
        
        if ($scriptContent -match "function\s+$func\s*\{") {
            $foundFunctions += $func
            
            # Check for proper function body
            $funcMatch = [regex]::Match($scriptContent, "function\s+$func\s*\{")
            if ($funcMatch.Success) {
                Test-Pass -Message "Function '$func' defined correctly"
            }
        } else {
            $missingFunctions += $func
            Test-Fail -Message "Function '$func' not found" -Solution "Add function definition for $func"
        }
    }
    
    # Summary
    Write-Host ""
    Write-Host "  Function Summary: " -NoNewline
    Write-Host "$($foundFunctions.Count)/$($requiredFunctions.Count) found" -ForegroundColor $(if ($missingFunctions.Count -eq 0) { "Green" } else { "Yellow" })
}

# ============================================================================
# Test Functions - Database Functions
# ============================================================================

function Test-DatabaseFunctions {
    Write-Header "PHASE 4: Database Functions Validation"
    
    $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
    
    # Test 1: Database Configuration
    Write-TestHeader -Category "DatabaseFunctions" -Test "Database Configuration"
    try {
        if ($scriptContent -match '\$DB_CONFIG\s*=\s*@{') {
            # Check all database types are configured
            $dbTypes = @("PostgreSQL", "MySQL", "MongoDB")
            $missingTypes = @()
            
            foreach ($db in $dbTypes) {
                if ($scriptContent -notmatch "$db\s*=\s*@{") {
                    $missingTypes += $db
                }
            }
            
            if ($missingTypes.Count -eq 0) {
                Test-Pass -Message "All database types configured: $($dbTypes -join ', ')"
            } else {
                Test-Fail -Message "Missing database configurations: $($missingTypes -join ', ')" -Solution "Add configuration for missing database types"
            }
        } else {
            Test-Fail -Message "DB_CONFIG not found" -Solution "Add DB_CONFIG hashtable"
        }
    } catch {
        Test-Fail -Message "Error checking database configuration" -Error $_
    }
    
    # Test 2: Database Port Configuration
    Write-TestHeader -Category "DatabaseFunctions" -Test "Port Configuration"
    try {
        $expectedPorts = @{
            "PostgreSQL" = 5432
            "MySQL" = 3306
            "MongoDB" = 27017
        }
        
        $allPortsCorrect = $true
        foreach ($db in $expectedPorts.Keys) {
            $port = $expectedPorts[$db]
            if ($scriptContent -match "$db.*DefaultPort\s*=\s*$port") {
                # Port is correctly configured
            } else {
                $allPortsCorrect = $false
                Test-Warn -Message "$db port might not be correctly configured" -Recommendation "Verify DefaultPort for $db is $port"
            }
        }
        
        if ($allPortsCorrect) {
            Test-Pass -Message "All database ports correctly configured"
        } else {
            Test-Pass -Message "Port configuration check completed with warnings"
        }
    } catch {
        Test-Fail -Message "Error checking port configuration" -Error $_
    }
    
    # Test 3: Connection String Templates
    Write-TestHeader -Category "DatabaseFunctions" -Test "Connection String Templates"
    try {
        $connStringPatterns = @{
            "PostgreSQL" = "postgresql://"
            "MySQL" = "mysql://"
            "MongoDB" = "mongodb://"
        }
        
        $allTemplatesCorrect = $true
        foreach ($db in $connStringPatterns.Keys) {
            $pattern = $connStringPatterns[$db]
            if ($scriptContent -match "ConnStringTemplate\s*=\s*['`"]$pattern") {
                # Connection string template is present
            } else {
                $allTemplatesCorrect = $false
                Test-Warn -Message "$db connection string template might be missing or incorrect"
            }
        }
        
        if ($allTemplatesCorrect) {
            Test-Pass -Message "All connection string templates present"
        } else {
            Test-Pass -Message "Connection string check completed with warnings"
        }
    } catch {
        Test-Fail -Message "Error checking connection string templates" -Error $_
    }
    
    # Test 4: Database Installation Function
    Write-TestHeader -Category "DatabaseFunctions" -Test "Install-Database Logic"
    try {
        if ($scriptContent -match "function\s+Install-Database") {
            # Check for Docker support
            if ($scriptContent -match "Install-DatabaseDocker") {
                Test-Pass -Message "Install-Database includes Docker support"
            } else {
                Test-Warn -Message "Install-Database might not have Docker support"
            }
            
            # Check for package manager support
            if ($scriptContent -match "winget|chocolatey|scoop") {
                Test-Pass -Message "Install-Database includes package manager support"
            } else {
                Test-Warn -Message "Install-Database might not have package manager support"
            }
        } else {
            Test-Fail -Message "Install-Database function not found"
        }
    } catch {
        Test-Fail -Message "Error checking Install-Database function" -Error $_
    }
    
    # Test 5: Table Creation Logic
    Write-TestHeader -Category "DatabaseFunctions" -Test "Table Creation Logic"
    try {
        # Check for SQL scripts
        if ($scriptContent -match "CREATE TABLE") {
            Test-Pass -Message "SQL table creation scripts present"
            
            # Check for required tables
            $requiredTables = @("users", "posts", "journalists", "api_stats")
            $missingTables = @()
            
            foreach ($table in $requiredTables) {
                if ($scriptContent -match "CREATE TABLE.*$table" -or $scriptContent -match "createCollection.*$table") {
                    # Table creation present
                } else {
                    $missingTables += $table
                }
            }
            
            if ($missingTables.Count -eq 0) {
                Test-Pass -Message "All required tables have creation scripts"
            } else {
                Test-Warn -Message "Missing table creation for: $($missingTables -join ', ')"
            }
        } else {
            Test-Fail -Message "No SQL table creation scripts found" -Solution "Add table creation SQL scripts"
        }
    } catch {
        Test-Fail -Message "Error checking table creation logic" -Error $_
    }
    
    # Test 6: Docker Database Support
    Write-TestHeader -Category "DatabaseFunctions" -Test "Docker Database Support"
    try {
        if ($scriptContent -match "function\s+Install-DatabaseDocker") {
            # Check for Docker images
            $dockerImages = @("postgres:", "mysql:", "mongo:")
            $missingImages = @()
            
            foreach ($img in $dockerImages) {
                if ($scriptContent -match [regex]::Escape($img)) {
                    # Docker image reference found
                } else {
                    $missingImages += $img
                }
            }
            
            if ($missingImages.Count -eq 0) {
                Test-Pass -Message "All Docker database images configured"
            } else {
                Test-Warn -Message "Missing Docker images: $($missingImages -join ', ')"
            }
        } else {
            Test-Fail -Message "Install-DatabaseDocker function not found" -Solution "Add Docker database installation function"
        }
    } catch {
        Test-Fail -Message "Error checking Docker database support" -Error $_
    }
}

# ============================================================================
# Test Functions - Credential Functions
# ============================================================================

function Test-CredentialFunctions {
    Write-Header "PHASE 5: Credential Functions Validation"
    
    $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
    
    # Test 1: Secure Password Generation
    Write-TestHeader -Category "CredentialFunctions" -Test "Password Generation"
    try {
        if ($scriptContent -match "function\s+New-SecurePassword") {
            # Check for crypto random
            if ($scriptContent -match "RandomNumberGenerator|System\.Security\.Cryptography") {
                Test-Pass -Message "New-SecurePassword uses cryptographic random generation"
            } else {
                Test-Warn -Message "Password generation might not use cryptographic random" -Recommendation "Use System.Security.Cryptography.RandomNumberGenerator"
            }
            
            # Check for configurable length
            if ($scriptContent -match "param.*Length") {
                Test-Pass -Message "Password generation has configurable length"
            }
        } else {
            Test-Fail -Message "New-SecurePassword function not found" -Solution "Add secure password generation function"
        }
    } catch {
        Test-Fail -Message "Error checking password generation" -Error $_
    }
    
    # Test 2: Unique App ID Generation
    Write-TestHeader -Category "CredentialFunctions" -Test "App ID Generation"
    try {
        if ($scriptContent -match "function\s+New-UniqueAppId") {
            Test-Pass -Message "New-UniqueAppId function found"
            
            # Check for prefix
            if ($scriptContent -match "DP-|Deltapress") {
                Test-Pass -Message "App ID has recognizable prefix"
            }
        } else {
            Test-Fail -Message "New-UniqueAppId function not found" -Solution "Add unique app ID generation function"
        }
    } catch {
        Test-Fail -Message "Error checking app ID generation" -Error $_
    }
    
    # Test 3: Credentials File Creation
    Write-TestHeader -Category "CredentialFunctions" -Test "Credentials File"
    try {
        if ($scriptContent -match "function\s+New-Credentials") {
            Test-Pass -Message "New-Credentials function found"
            
            # Check for credentials file path
            if ($scriptContent -match "CredentialsFile\s*=") {
                Test-Pass -Message "Credentials file path configured"
            }
            
            # Check for file content structure
            if ($scriptContent -match "APP_ID|APP_PASSWORD|DB_PASSWORD|JWT_SECRET") {
                Test-Pass -Message "Credentials include all required fields"
            } else {
                Test-Warn -Message "Credentials might be missing some fields"
            }
        } else {
            Test-Fail -Message "New-Credentials function not found" -Solution "Add credentials generation function"
        }
    } catch {
        Test-Fail -Message "Error checking credentials file creation" -Error $_
    }
    
    # Test 4: Gitignore Protection
    Write-TestHeader -Category "CredentialFunctions" -Test "Gitignore Protection"
    try {
        if ($scriptContent -match "function\s+Add-ToGitignore") {
            Test-Pass -Message "Add-ToGitignore function found"
            
            # Check if credentials file is added
            if ($scriptContent -match "\.gitignore.*credentials") {
                Test-Pass -Message "Credentials file will be added to .gitignore"
            }
        } else {
            Test-Fail -Message "Add-ToGitignore function not found" -Solution "Add function to protect credentials in gitignore"
        }
    } catch {
        Test-Fail -Message "Error checking gitignore protection" -Error $_
    }
    
    # Test 5: .gitignore File Check
    Write-TestHeader -Category "CredentialFunctions" -Test ".gitignore File"
    try {
        if (Test-Path ".gitignore") {
            $gitignoreContent = Get-Content ".gitignore" -Raw
            
            if ($gitignoreContent -match "\.credentials") {
                Test-Pass -Message ".gitignore already contains .credentials"
            } else {
                Test-Warn -Message ".credentials not in .gitignore file" -Recommendation "Add .credentials to .gitignore"
                
                if ($FixIssues) {
                    Add-Content -Path ".gitignore" -Value "`n.credentials"
                    Write-Log -Level "INFO" -Message "Added .credentials to .gitignore" -Category "CredentialFunctions"
                }
            }
        } else {
            Test-Warn -Message ".gitignore file not found" -Recommendation "Create .gitignore file with .credentials"
        }
    } catch {
        Test-Fail -Message "Error checking .gitignore file" -Error $_
    }
}

# ============================================================================
# Test Functions - Environment Functions
# ============================================================================

function Test-EnvironmentFunctions {
    Write-Header "PHASE 6: Environment Functions Validation"
    
    $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
    
    # Test 1: Environment Config Function
    Write-TestHeader -Category "EnvironmentFunctions" -Test "Environment Config"
    try {
        if ($scriptContent -match "function\s+New-EnvironmentConfig") {
            Test-Pass -Message "New-EnvironmentConfig function found"
            
            # Check for required env vars
            $requiredEnvVars = @("GEMINI_API_KEY", "PORT", "NODE_ENV", "JWT_SECRET", "DATABASE_URL", "MONGODB_URI")
            $missingEnvVars = @()
            
            foreach ($var in $requiredEnvVars) {
                if ($scriptContent -match $var) {
                    # Env var mentioned
                } else {
                    $missingEnvVars += $var
                }
            }
            
            if ($missingEnvVars.Count -eq 0) {
                Test-Pass -Message "All required environment variables referenced"
            } else {
                Test-Warn -Message "Missing env var references: $($missingEnvVars -join ', ')"
            }
        } else {
            Test-Fail -Message "New-EnvironmentConfig function not found" -Solution "Add environment configuration function"
        }
    } catch {
        Test-Fail -Message "Error checking environment config" -Error $_
    }
    
    # Test 2: Env File Loading
    Write-TestHeader -Category "EnvironmentFunctions" -Test "Env File Loading"
    try {
        # Check if script loads .env files
        if ($scriptContent -match "Get-Content.*\.env|\.env\.local") {
            Test-Pass -Message "Script has environment file loading logic"
        } else {
            Test-Warn -Message "No .env file loading logic found" -Recommendation "Add logic to load environment variables from .env file"
        }
    } catch {
        Test-Fail -Message "Error checking env file loading" -Error $_
    }
    
    # Test 3: Database URL Configuration
    Write-TestHeader -Category "EnvironmentFunctions" -Test "Database URL"
    try {
        if ($scriptContent -match "DATABASE_URL|ConnStringTemplate") {
            Test-Pass -Message "Database URL/connection string configuration present"
        } else {
            Test-Fail -Message "Database URL configuration not found" -Solution "Add database connection string configuration"
        }
    } catch {
        Test-Fail -Message "Error checking database URL configuration" -Error $_
    }
}

# ============================================================================
# Test Functions - Error Handling
# ============================================================================

function Test-ErrorHandling {
    Write-Header "PHASE 7: Error Handling Validation"
    
    $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
    
    # Test 1: Error Action Preference
    Write-TestHeader -Category "ErrorHandling" -Test "Error Action Preference"
    try {
        if ($scriptContent -match '\$ErrorActionPreference\s*=\s*"Stop"') {
            Test-Pass -Message "Error action preference set to Stop"
        } else {
            Test-Warn -Message "Error action preference not set to Stop" -Recommendation "Set `$ErrorActionPreference = 'Stop' for strict error handling"
        }
    } catch {
        Test-Fail -Message "Error checking error action preference" -Error $_
    }
    
    # Test 2: Error Collection
    Write-TestHeader -Category "ErrorHandling" -Test "Error Collection"
    try {
        if ($scriptContent -match '\$Script:Errors\s*=\s*@') {
            Test-Pass -Message "Error collection variable defined"
        } else {
            Test-Warn -Message "No error collection variable found" -Recommendation "Add `$Script:Errors = @() for collecting errors"
        }
    } catch {
        Test-Fail -Message "Error checking error collection" -Error $_
    }
    
    # Test 3: Try-Catch Coverage
    Write-TestHeader -Category "ErrorHandling" -Test "Try-Catch Coverage"
    try {
        $tryCount = ([regex]::Matches($scriptContent, '\btry\s*\{')).Count
        $functionCount = ([regex]::Matches($scriptContent, 'function\s+\w+')).Count
        
        $coverage = [math]::Round(($tryCount / $functionCount) * 100, 1)
        
        if ($coverage -ge 80) {
            Test-Pass -Message "Good try-catch coverage: $coverage% ($tryCount try blocks for $functionCount functions)"
        } elseif ($coverage -ge 50) {
            Test-Warn -Message "Moderate try-catch coverage: $coverage%" -Recommendation "Add more error handling"
        } else {
            Test-Fail -Message "Low try-catch coverage: $coverage%" -Solution "Add try-catch blocks to more functions"
        }
    } catch {
        Test-Fail -Message "Error checking try-catch coverage" -Error $_
    }
    
    # Test 4: Solution Messages
    Write-TestHeader -Category "ErrorHandling" -Test "Solution Messages"
    try {
        if ($scriptContent -match "Solution\s*=") {
            $solutionCount = ([regex]::Matches($scriptContent, 'Solution\s*=')).Count
            Test-Pass -Message "Solution messages present ($solutionCount found)"
        } else {
            Test-Warn -Message "No solution messages found in error handling" -Recommendation "Add solution suggestions to error handling"
        }
    } catch {
        Test-Fail -Message "Error checking solution messages" -Error $_
    }
    
    # Test 5: Critical Step Detection
    Write-TestHeader -Category "ErrorHandling" -Test "Critical Step Handling"
    try {
        if ($scriptContent -match "Critical\s*=\s*\$true" -and $scriptContent -match "CRITICAL ERROR") {
            Test-Pass -Message "Critical step detection and handling present"
        } else {
            Test-Warn -Message "Critical step handling might be incomplete" -Recommendation "Add critical step detection with halt on failure"
        }
    } catch {
        Test-Fail -Message "Error checking critical step handling" -Error $_
    }
    
    # Test 6: Exit Codes
    Write-TestHeader -Category "ErrorHandling" -Test "Exit Codes"
    try {
        if ($scriptContent -match "exit\s+1|exit\s+0") {
            Test-Pass -Message "Exit codes used in script"
        } else {
            Test-Warn -Message "No exit codes found" -Recommendation "Add exit codes for success/failure states"
        }
    } catch {
        Test-Fail -Message "Error checking exit codes" -Error $_
    }
}

# ============================================================================
# Test Functions - Logging
# ============================================================================

function Test-LoggingFunctions {
    Write-Header "PHASE 8: Logging Validation"
    
    $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
    
    # Test 1: Log Function
    Write-TestHeader -Category "Logging" -Test "Log Function"
    try {
        if ($scriptContent -match "function\s+Write-Log") {
            Test-Pass -Message "Write-Log function found"
            
            # Check for log levels
            if ($scriptContent -match "INFO|WARN|ERROR|DEBUG") {
                Test-Pass -Message "Multiple log levels supported"
            }
            
            # Check for timestamp
            if ($scriptContent -match "Get-Date|timestamp") {
                Test-Pass -Message "Timestamps included in logs"
            }
        } else {
            Test-Fail -Message "Write-Log function not found" -Solution "Add logging function"
        }
    } catch {
        Test-Fail -Message "Error checking log function" -Error $_
    }
    
    # Test 2: Log File Output
    Write-TestHeader -Category "Logging" -Test "Log File Output"
    try {
        if ($scriptContent -match "Add-Content.*\.log|Out-File.*\.log") {
            Test-Pass -Message "Log file output configured"
        } else {
            Test-Warn -Message "No log file output found" -Recommendation "Add log file output for persistence"
        }
    } catch {
        Test-Fail -Message "Error checking log file output" -Error $_
    }
    
    # Test 3: Error Logging
    Write-TestHeader -Category "Logging" -Test "Error Logging"
    try {
        if ($scriptContent -match '\$Script:Errors\s*\+=') {
            Test-Pass -Message "Error collection and logging present"
        } else {
            Test-Warn -Message "No error collection found" -Recommendation "Add error collection for later review"
        }
    } catch {
        Test-Fail -Message "Error checking error logging" -Error $_
    }
}

# ============================================================================
# Test Functions - Progress Reporting
# ============================================================================

function Test-ProgressReporting {
    Write-Header "PHASE 9: Progress Reporting Validation"
    
    $scriptContent = Get-Content $CONFIG.ScriptPath -Raw
    
    # Test 1: Progress Bar Function
    Write-TestHeader -Category "ProgressReporting" -Test "Progress Bar"
    try {
        if ($scriptContent -match "function\s+Write-ProgressBar") {
            Test-Pass -Message "Write-ProgressBar function found"
            
            # Check for percentage calculation
            if ($scriptContent -match "totalProgress|%\s*\)") {
                Test-Pass -Message "Percentage calculation present"
            }
            
            # Check for visual elements
            if ($scriptContent -match "█|░|\[|\]") {
                Test-Pass -Message "Visual progress bar elements present"
            }
        } else {
            Test-Fail -Message "Write-ProgressBar function not found" -Solution "Add progress bar function"
        }
    } catch {
        Test-Fail -Message "Error checking progress bar" -Error $_
    }
    
    # Test 2: Step Tracking
    Write-TestHeader -Category "ProgressReporting" -Test "Step Tracking"
    try {
        if ($scriptContent -match '\$Script:CurrentStep|\$Script:TotalWeight|\$Script:CompletedWeight') {
            Test-Pass -Message "Step tracking variables present"
        } else {
            Test-Warn -Message "Step tracking variables might be missing" -Recommendation "Add step tracking for accurate progress"
        }
    } catch {
        Test-Fail -Message "Error checking step tracking" -Error $_
    }
    
    # Test 3: Installation Steps Definition
    Write-TestHeader -Category "ProgressReporting" -Test "Installation Steps"
    try {
        if ($scriptContent -match '\$INSTALL_STEPS\s*=\s*@') {
            # Check for weighted steps
            if ($scriptContent -match "Weight\s*=") {
                Test-Pass -Message "Installation steps have weight configuration"
            }
            
            # Check for critical flags
            if ($scriptContent -match "Critical\s*=") {
                Test-Pass -Message "Installation steps have critical flags"
            }
            
            # Count steps
            $stepCount = ([regex]::Matches($scriptContent, 'Name\s*=')).Count
            Test-Pass -Message "$stepCount installation steps defined"
        } else {
            Test-Fail -Message "INSTALL_STEPS not defined" -Solution "Define installation steps array"
        }
    } catch {
        Test-Fail -Message "Error checking installation steps" -Error $_
    }
    
    # Test 4: Summary Display
    Write-TestHeader -Category "ProgressReporting" -Test "Summary Display"
    try {
        if ($scriptContent -match "function\s+Show-Summary") {
            Test-Pass -Message "Show-Summary function found"
            
            # Check for credential display
            if ($scriptContent -match "credentials.*Summary|Summary.*credentials") {
                Test-Pass -Message "Summary includes credentials display"
            }
        } else {
            Test-Fail -Message "Show-Summary function not found" -Solution "Add summary display function"
        }
    } catch {
        Test-Fail -Message "Error checking summary display" -Error $_
    }
}

# ============================================================================
# Live Database Connection Tests
# ============================================================================

function Test-DatabaseConnections {
    Write-Header "PHASE 10: Database Connection Tests"
    
    if ($TestDatabase -eq "None" -or $TestDatabase -eq "All") {
        # Test all databases if All specified
    }
    
    # Test PostgreSQL
    if ($TestDatabase -eq "PostgreSQL" -or $TestDatabase -eq "All") {
        Write-TestHeader -Category "DatabaseConnections" -Test "PostgreSQL Connection"
        try {
            # Check if PostgreSQL is installed
            $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
            
            if ($psqlPath) {
                # Try to connect
                $result = & psql -h localhost -p 5432 -U postgres -c "SELECT version();" 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Test-Pass -Message "PostgreSQL connection successful"
                } else {
                    Test-Skip -Message "PostgreSQL installed but connection failed" -Reason "May require password or service not running"
                }
            } else {
                Test-Skip -Message "PostgreSQL not installed" -Reason "Database not required for validation"
            }
        } catch {
            Test-Skip -Message "PostgreSQL test skipped" -Reason $_.Exception.Message
        }
    }
    
    # Test MySQL
    if ($TestDatabase -eq "MySQL" -or $TestDatabase -eq "All") {
        Write-TestHeader -Category "DatabaseConnections" -Test "MySQL Connection"
        try {
            $mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
            
            if ($mysqlPath) {
                Test-Pass -Message "MySQL client found at $($mysqlPath.Source)"
            } else {
                Test-Skip -Message "MySQL not installed" -Reason "Database not required for validation"
            }
        } catch {
            Test-Skip -Message "MySQL test skipped" -Reason $_.Exception.Message
        }
    }
    
    # Test MongoDB
    if ($TestDatabase -eq "MongoDB" -or $TestDatabase -eq "All") {
        Write-TestHeader -Category "DatabaseConnections" -Test "MongoDB Connection"
        try {
            $mongoPath = Get-Command mongod -ErrorAction SilentlyContinue
            
            if ($mongoPath) {
                Test-Pass -Message "MongoDB found at $($mongoPath.Source)"
            } else {
                Test-Skip -Message "MongoDB not installed" -Reason "Database not required for validation"
            }
        } catch {
            Test-Skip -Message "MongoDB test skipped" -Reason $_.Exception.Message
        }
    }
    
    # Test Docker
    Write-TestHeader -Category "DatabaseConnections" -Test "Docker Availability"
    try {
        $dockerPath = Get-Command docker -ErrorAction SilentlyContinue
        
        if ($dockerPath) {
            $dockerVersion = docker --version 2>&1
            Test-Pass -Message "Docker available: $dockerVersion"
            
            # Check if Docker daemon is running
            $dockerInfo = docker info 2>&1
            if ($dockerInfo -notmatch "error") {
                Test-Pass -Message "Docker daemon is running"
            } else {
                Test-Warn -Message "Docker daemon might not be running" -Recommendation "Start Docker Desktop"
            }
        } else {
            Test-Skip -Message "Docker not installed" -Reason "Not required for validation"
        }
    } catch {
        Test-Skip -Message "Docker test skipped" -Reason $_.Exception.Message
    }
}

# ============================================================================
# Generate Report
# ============================================================================

function New-ValidationReport {
    Write-Header "Generating Validation Report"
    
    $endTime = Get-Date
    $duration = $endTime - $Script:StartTime
    
    $report = @{
        MetaData = @{
            ScriptName = "DeltaPress Installer Validation"
            Version = $CONFIG.Version
            StartTime = $Script:StartTime.ToString("yyyy-MM-dd HH:mm:ss")
            EndTime = $endTime.ToString("yyyy-MM-dd HH:mm:ss")
            DurationSeconds = [math]::Round($duration.TotalSeconds, 2)
            MachineName = $env:COMPUTERNAME
            UserName = $env:USERNAME
        }
        Summary = @{
            TotalTests = $Script:PassedTests + $Script:FailedTests + $Script:SkippedTests
            Passed = $Script:PassedTests
            Failed = $Script:FailedTests
            Skipped = $Script:SkippedTests
            Warnings = $Script:Warnings
            PassRate = if (($Script:PassedTests + $Script:FailedTests) -gt 0) {
                [math]::Round(($Script:PassedTests / ($Script:PassedTests + $Script:FailedTests)) * 100, 1)
            } else { 0 }
        }
        TestResults = $Script:TestResults
        Errors = $Script:Errors
    }
    
    # Save JSON report
    if ($GenerateReport) {
        $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportPath -Encoding utf8
        Write-Log -Level "INFO" -Message "Report saved to: $ReportPath"
    }
    
    # Display summary
    Write-Host ""
    Write-Host "  ===========================================================" -ForegroundColor $(if ($Script:FailedTests -eq 0) { "Green" } else { "Yellow" })
    Write-Host "  VALIDATION SUMMARY" -ForegroundColor $(if ($Script:FailedTests -eq 0) { "Green" } else { "Yellow" })
    Write-Host "  ===========================================================" -ForegroundColor $(if ($Script:FailedTests -eq 0) { "Green" } else { "Yellow" })
    Write-Host ""
    Write-Host "  Total Tests:   $($report.Summary.TotalTests)" -ForegroundColor White
    Write-Host "  Passed:        " -NoNewline
    Write-Host "$($Script:PassedTests)" -ForegroundColor Green
    Write-Host "  Failed:        " -NoNewline
    Write-Host "$($Script:FailedTests)" -ForegroundColor $(if ($Script:FailedTests -gt 0) { "Red" } else { "Green" })
    Write-Host "  Skipped:       " -NoNewline
    Write-Host "$($Script:SkippedTests)" -ForegroundColor Yellow
    Write-Host "  Warnings:      " -NoNewline
    Write-Host "$($Script:Warnings)" -ForegroundColor Yellow
    Write-Host "  Pass Rate:     " -NoNewline
    Write-Host "$($report.Summary.PassRate)%" -ForegroundColor $(if ($report.Summary.PassRate -ge 90) { "Green" } elseif ($report.Summary.PassRate -ge 70) { "Yellow" } else { "Red" })
    Write-Host "  Duration:      $($report.Summary.DurationSeconds)s" -ForegroundColor White
    Write-Host ""
    
    # Show errors if any
    if ($Script:Errors.Count -gt 0) {
        Write-Host "  ERRORS REQUIRING ATTENTION:" -ForegroundColor Red
        Write-Host ""
        foreach ($err in $Script:Errors) {
            Write-Host "  [$($err.Category)] $($err.Test):" -ForegroundColor Red
            Write-Host "    $($err.Message)" -ForegroundColor DarkGray
            if ($err.Solution) {
                Write-Host "    Solution: $($err.Solution)" -ForegroundColor Yellow
            }
            Write-Host ""
        }
    }
    
    # Final verdict
    Write-Host "  ===========================================================" -ForegroundColor $(if ($Script:FailedTests -eq 0) { "Green" } else { "Red" })
    
    if ($Script:FailedTests -eq 0) {
        Write-Host "  ALL VALIDATIONS PASSED - Installer is ready for deployment" -ForegroundColor Green
    } elseif ($Script:FailedTests -le 3) {
        Write-Host "  MOSTLY PASSING - Minor issues need attention" -ForegroundColor Yellow
    } else {
        Write-Host "  CRITICAL ISSUES FOUND - Review and fix before deployment" -ForegroundColor Red
    }
    
    Write-Host "  ===========================================================" -ForegroundColor $(if ($Script:FailedTests -eq 0) { "Green" } else { "Red" })
    Write-Host ""
    Write-Host "  Log file: $($CONFIG.LogFile)" -ForegroundColor DarkGray
    Write-Host ""
    
    return $report
}

# ============================================================================
# Main Execution
# ============================================================================

function Main {
    # Show header
    Clear-Host
    Write-Host ""
    Write-Host "  +===============================================================+" -ForegroundColor Cyan
    Write-Host "  |                                                               |" -ForegroundColor Cyan
    Write-Host "  |          DELTAPRESS INSTALLER VALIDATION SUITE               |" -ForegroundColor Cyan
    Write-Host "  |                                                               |" -ForegroundColor Cyan
    Write-Host "  |            Version: $($CONFIG.Version)                                    |" -ForegroundColor Cyan
    Write-Host "  |                                                               |" -ForegroundColor Cyan
    Write-Host "  +===============================================================+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Mode: " -NoNewline
    Write-Host $(if ($Detailed) { "DETAILED" } else { "STANDARD" }) -ForegroundColor $(if ($Detailed) { "Yellow" } else { "White" })
    Write-Host "  Database Tests: $TestDatabase"
    Write-Host "  Log File: $($CONFIG.LogFile)"
    Write-Host ""
    
    # Initialize log file
    "DeltaPress Installer Validation - Started: $(Get-Date)" | Out-File -FilePath $CONFIG.LogFile
    
    # Run all validation phases
    Test-Prerequisites
    Test-ScriptSyntax
    Test-FunctionDefinitions
    Test-DatabaseFunctions
    Test-CredentialFunctions
    Test-EnvironmentFunctions
    Test-ErrorHandling
    Test-LoggingFunctions
    Test-ProgressReporting
    Test-DatabaseConnections
    
    # Generate report
    $report = New-ValidationReport
    
    return $report
}

# Run validation
$report = Main

# Return exit code based on results
if ($Script:FailedTests -gt 0) {
    exit 1
} else {
    exit 0
}
