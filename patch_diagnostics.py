import re

with open('views/Admin/DiagnosticsView.tsx', 'r') as f:
    content = f.read()

PRESET_PROVIDERS = """
const PRESET_PROVIDERS = [
  { name: 'Custom', endpoint: '', model: '' },
  { name: 'Moonshot Kimi', endpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
  { name: 'Zhipu AI (Z.AI)', endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  { name: 'AI/ML API', endpoint: 'https://api.aimlapi.com/chat/completions', model: 'gpt-4o' },
  { name: 'ChatGPT', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  { name: 'GROK (xAI)', endpoint: 'https://api.x.ai/v1/chat/completions', model: 'grok-beta' },
  { name: 'Claude (Anthropic)', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022' }
];
"""

# Add PRESET_PROVIDERS after TableHealth interface
content = re.sub(
    r'(interface TableHealth \{.*?\})',
    r'\1\n\n' + PRESET_PROVIDERS.strip() + '\n',
    content,
    flags=re.DOTALL
)

# Add selectedProvider state
content = re.sub(
    r'(const \[testEndpoint, setTestEndpoint\] = useState\([^)]+\);)',
    r"const [selectedProvider, setSelectedProvider] = useState('Moonshot Kimi');\n  \1",
    content
)

# Add handleProviderChange function
HANDLE_CHANGE = """
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerName = e.target.value;
    setSelectedProvider(providerName);

    if (providerName === 'Custom') return;

    const provider = PRESET_PROVIDERS.find(p => p.name === providerName);
    if (provider) {
      setTestEndpoint(provider.endpoint);
      setTestModel(provider.model);
    }
  };
"""

content = re.sub(
    r'(const runApiKeyTest = async \(\) => \{)',
    HANDLE_CHANGE.strip() + '\n\n  \1',
    content
)

# Add dropdown to UI
DROPDOWN_UI = """
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-2">Select Provider Preset</label>
            <select
              value={selectedProvider}
              onChange={handleProviderChange}
              className="border border-gray-300 p-2 rounded text-xs font-mono w-full md:w-1/2"
            >
              {PRESET_PROVIDERS.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
"""

content = re.sub(
    r'(<div className="grid grid-cols-1 md:grid-cols-2 gap-4">)',
    DROPDOWN_UI.strip(),
    content
)

with open('views/Admin/DiagnosticsView.tsx', 'w') as f:
    f.write(content)
