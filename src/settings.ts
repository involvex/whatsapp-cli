import { promptUser } from "./readline-utils";
import type { Interface as ReadlineInterface } from "readline";
import { colors, printHeader, printMenu, printSection, printTable } from "./ui";
import {
  getConfig,
  saveConfig,
  getAvailableModels,
  PATHS,
  type CliConfig,
} from "./config";

const PROVIDERS = ["none", "openrouter", "openai", "gemini"];
const THEMES = ["default", "dark", "colorful"];
const LOG_LEVELS = ["debug", "info", "warn", "error", "none"];

export async function showSettingsMenu(rl: ReadlineInterface): Promise<void> {
  let showSettings = true;

  while (showSettings) {
    const config = getConfig();

    console.clear();
    printHeader("⚙️  Settings Menu");

    printSection("Current Configuration");
    printTable(
      [
        [
          "AI Provider",
          config.aiProvider.provider === "none"
            ? colors.dim("Disabled")
            : colors.provider(config.aiProvider.provider),
        ],
        [
          "AI Model",
          config.aiProvider.provider === "none"
            ? colors.dim("N/A")
            : colors.model(config.aiProvider.model),
        ],
        ["Theme", colors.highlight(config.theme)],
        ["Message Limit", config.messageLimit.toString()],
        [
          "Auto-Reconnect",
          config.autoReconnect
            ? colors.success("Enabled")
            : colors.error("Disabled"),
        ],
        ["Log Level", colors.highlight(config.logging.level.toUpperCase())],
        [
          "Chat History",
          config.chatHistoryEnabled
            ? colors.success("Enabled")
            : colors.error("Disabled"),
        ],
      ].map(([label, value]) => ({
        label: label as string,
        value: value as string,
      })),
    );

    printMenu([
      { num: "1", text: "Configure AI Provider" },
      { num: "2", text: "Set AI Model" },
      { num: "3", text: "Set API Key" },
      { num: "4", text: "Adjust Temperature (Creativity)" },
      { num: "5", text: "Set Max Tokens" },
      { num: "6", text: "Change Theme" },
      { num: "7", text: "Configure Logging" },
      { num: "8", text: "Toggle Chat History" },
      { num: "9", text: "Reset to Default" },
      { num: "0", text: "Back to Main Menu" },
    ]);

    const choice = await promptUser(rl, colors.highlight("Select option: "));

    switch (choice) {
      case "1":
        await configureProvider(rl);
        break;
      case "2":
        await setModel(rl);
        break;
      case "3":
        await setApiKey(rl);
        break;
      case "4":
        await setTemperature(rl);
        break;
      case "5":
        await setMaxTokens(rl);
        break;
      case "6":
        await changeTheme(rl);
        break;
      case "7":
        await configureLogging(rl);
        break;
      case "8":
        await toggleChatHistory(rl);
        break;
      case "9":
        await resetSettings(rl);
        break;
      case "0":
        showSettings = false;
        break;
      default:
        console.log(colors.error("Invalid option"));
        await promptUser(rl, "Press Enter to continue...");
    }
  }
}

async function configureProvider(rl: ReadlineInterface): Promise<void> {
  console.clear();
  printHeader("Select AI Provider");

  console.log(colors.info("Available providers:"));
  PROVIDERS.forEach((p, i) => {
    console.log(`  ${i + 1}. ${colors.provider(p)}`);
  });

  console.log("");
  const choice = await promptUser(
    rl,
    colors.highlight("Select provider (1-4): "),
  );
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < PROVIDERS.length) {
    const config = getConfig();
    config.aiProvider.provider = PROVIDERS[index] as
      | "none"
      | "openrouter"
      | "openai"
      | "gemini";

    if (config.aiProvider.provider === "none") {
      config.aiProvider.apiKey = "";
      config.aiProvider.model = "auto";
    }

    await saveConfig(config);
    console.log(
      colors.success(
        `Provider set to ${colors.provider(config.aiProvider.provider)}`,
      ),
    );
  } else {
    console.log(colors.error("Invalid selection"));
  }

  await promptUser(rl, "Press Enter to continue...");
}

async function setModel(rl: ReadlineInterface): Promise<void> {
  const config = getConfig();

  if (config.aiProvider.provider === "none") {
    console.log(colors.warning("Enable an AI provider first"));
    await promptUser(rl, "Press Enter to continue...");
    return;
  }

  console.clear();
  printHeader(`Select Model for ${config.aiProvider.provider}`);

  const models = getAvailableModels(config.aiProvider.provider);
  console.log(colors.info("Available models:"));
  models.forEach((m, i) => {
    console.log(`  ${i + 1}. ${colors.model(m)}`);
  });

  console.log("");
  const choice = await promptUser(
    rl,
    colors.highlight(`Select model (1-${models.length}): `),
  );
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < models.length) {
    const selectedModel = models[index];
    if (selectedModel) {
      config.aiProvider.model = selectedModel;
      await saveConfig(config);
      console.log(
        colors.success(`Model set to ${colors.model(selectedModel)}`),
      );
    }
  } else {
    console.log(colors.error("Invalid selection"));
  }

  await promptUser(rl, "Press Enter to continue...");
}

async function setApiKey(rl: ReadlineInterface): Promise<void> {
  const config = getConfig();

  if (config.aiProvider.provider === "none") {
    console.log(colors.warning("Enable an AI provider first"));
    await promptUser(rl, "Press Enter to continue...");
    return;
  }

  console.clear();
  printHeader(`Enter API Key for ${config.aiProvider.provider}`);

  console.log(
    colors.info(
      "Enter your API key (will be saved locally in .whatsapp-cli-config.json):",
    ),
  );
  console.log("");

  const apiKey = await promptUser(rl, "API Key: ");

  if (apiKey.trim()) {
    config.aiProvider.apiKey = apiKey;
    await saveConfig(config);
    console.log(colors.success(`API key set (${apiKey.substring(0, 10)}...)`));
  } else {
    console.log(colors.warning("API key not set"));
  }

  await promptUser(rl, "Press Enter to continue...");
}

async function setTemperature(rl: ReadlineInterface): Promise<void> {
  console.clear();
  printHeader("Adjust Temperature (Creativity)");

  console.log(
    colors.info(
      "Temperature controls response creativity (0 = deterministic, 1 = creative)",
    ),
  );
  console.log(colors.dim("Recommended: 0.5 - 0.8"));
  console.log("");

  const input = await promptUser(
    rl,
    `Current: ${getConfig().aiProvider.temperature} - New value (0-1): `,
  );

  const temp = parseFloat(input);
  if (!isNaN(temp) && temp >= 0 && temp <= 1) {
    const config = getConfig();
    config.aiProvider.temperature = temp;
    await saveConfig(config);
    console.log(colors.success(`Temperature set to ${temp}`));
  } else {
    console.log(colors.error("Invalid value. Must be between 0 and 1"));
  }

  await promptUser(rl, "Press Enter to continue...");
}

async function setMaxTokens(rl: ReadlineInterface): Promise<void> {
  console.clear();
  printHeader("Set Max Tokens");

  console.log(colors.info("Max tokens controls response length"));
  console.log(colors.dim("Recommended: 300 - 1000"));
  console.log("");

  const input = await promptUser(
    rl,
    `Current: ${getConfig().aiProvider.maxTokens} - New value: `,
  );

  const tokens = parseInt(input, 10);
  if (!isNaN(tokens) && tokens > 0 && tokens <= 4000) {
    const config = getConfig();
    config.aiProvider.maxTokens = tokens;
    await saveConfig(config);
    console.log(colors.success(`Max tokens set to ${tokens}`));
  } else {
    console.log(colors.error("Invalid value. Must be 1-4000"));
  }

  await promptUser(rl, "Press Enter to continue...");
}

async function changeTheme(rl: ReadlineInterface): Promise<void> {
  console.clear();
  printHeader("Select Theme");

  console.log(colors.info("Available themes:"));
  THEMES.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t}`);
  });

  console.log("");
  const choice = await promptUser(rl, colors.highlight("Select theme (1-3): "));
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < THEMES.length) {
    const config = getConfig();
    config.theme = THEMES[index] as "default" | "dark" | "colorful";
    await saveConfig(config);
    console.log(colors.success(`Theme set to ${THEMES[index]}`));
  } else {
    console.log(colors.error("Invalid selection"));
  }

  await promptUser(rl, "Press Enter to continue...");
}

async function resetSettings(rl: ReadlineInterface): Promise<void> {
  console.clear();
  printHeader("Reset to Default Settings");

  console.log(colors.warning("This will reset ALL settings to default"));
  console.log("");

  const confirm = await promptUser(
    rl,
    colors.highlight("Are you sure? (yes/no): "),
  );

  if (confirm.toLowerCase() === "yes") {
    const defaultConfig: CliConfig = {
      aiProvider: {
        provider: "none",
        model: "auto",
        apiKey: "",
        temperature: 0.7,
        maxTokens: 500,
      },
      theme: "default",
      messageLimit: 15,
      autoReconnect: true,
      logging: {
        level: "info",
        console: true,
        file: true,
        filePath: PATHS.logs + "/whatsapp-cli",
        timestamp: true,
        colors: true,
      },
      chatHistoryEnabled: true,
    };

    await saveConfig(defaultConfig);
    console.log(colors.success("Settings reset to default"));
  } else {
    console.log(colors.warning("Reset cancelled"));
  }

  await promptUser(rl, "Press Enter to continue...");
}

async function configureLogging(rl: ReadlineInterface): Promise<void> {
  let showLoggingSettings = true;

  while (showLoggingSettings) {
    const config = getConfig();

    console.clear();
    printHeader("Configure Logging");

    printSection("Current Logging Settings");
    console.log(
      `  Log Level:        ${colors.highlight(config.logging.level.toUpperCase())}`,
    );
    console.log(
      `  Console Output:   ${config.logging.console ? colors.success("Enabled") : colors.error("Disabled")}`,
    );
    console.log(
      `  File Output:      ${config.logging.file ? colors.success("Enabled") : colors.error("Disabled")}`,
    );
    console.log(
      `  Timestamps:       ${config.logging.timestamp ? colors.success("Enabled") : colors.error("Disabled")}`,
    );
    console.log(
      `  Colors:           ${config.logging.colors ? colors.success("Enabled") : colors.error("Disabled")}`,
    );
    console.log(`  Log File:         ${colors.dim(config.logging.filePath)}`);

    console.log("");
    printMenu([
      { num: "1", text: "Set Log Level" },
      { num: "2", text: "Toggle Console Output" },
      { num: "3", text: "Toggle File Output" },
      { num: "4", text: "Toggle Timestamps" },
      { num: "5", text: "Toggle Colors" },
      { num: "0", text: "Back to Settings" },
    ]);

    const choice = await promptUser(rl, colors.highlight("Select option: "));

    switch (choice) {
      case "1":
        await setLogLevel(rl);
        break;
      case "2":
        config.logging.console = !config.logging.console;
        await saveConfig(config);
        console.log(
          colors.success(
            `Console output ${config.logging.console ? "enabled" : "disabled"}`,
          ),
        );
        await promptUser(rl, "Press Enter to continue...");
        break;
      case "3":
        config.logging.file = !config.logging.file;
        await saveConfig(config);
        console.log(
          colors.success(
            `File output ${config.logging.file ? "enabled" : "disabled"}`,
          ),
        );
        await promptUser(rl, "Press Enter to continue...");
        break;
      case "4":
        config.logging.timestamp = !config.logging.timestamp;
        await saveConfig(config);
        console.log(
          colors.success(
            `Timestamps ${config.logging.timestamp ? "enabled" : "disabled"}`,
          ),
        );
        await promptUser(rl, "Press Enter to continue...");
        break;
      case "5":
        config.logging.colors = !config.logging.colors;
        await saveConfig(config);
        console.log(
          colors.success(
            `Colors ${config.logging.colors ? "enabled" : "disabled"}`,
          ),
        );
        await promptUser(rl, "Press Enter to continue...");
        break;
      case "0":
        showLoggingSettings = false;
        break;
      default:
        console.log(colors.error("Invalid option"));
        await promptUser(rl, "Press Enter to continue...");
    }
  }
}

async function setLogLevel(rl: ReadlineInterface): Promise<void> {
  console.clear();
  printHeader("Set Log Level");

  console.log(colors.info("Available log levels:"));
  LOG_LEVELS.forEach((level, i) => {
    const desc = level === "none" ? " (disable logging)" : "";
    console.log(`  ${i + 1}. ${colors.highlight(level.toUpperCase())}${desc}`);
  });

  console.log("");
  console.log(colors.dim("debug = Most verbose"));
  console.log(colors.dim("error = Least verbose"));
  console.log("");

  const choice = await promptUser(
    rl,
    colors.highlight("Select log level (1-5): "),
  );
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < LOG_LEVELS.length) {
    const config = getConfig();
    const selectedLevel = LOG_LEVELS[index];
    if (selectedLevel) {
      config.logging.level = selectedLevel as
        | "debug"
        | "info"
        | "warn"
        | "error"
        | "none";
      await saveConfig(config);
      console.log(
        colors.success(`Log level set to ${selectedLevel.toUpperCase()}`),
      );
    }
  } else {
    console.log(colors.error("Invalid selection"));
  }

  await promptUser(rl, "Press Enter to continue...");
}

async function toggleChatHistory(rl: ReadlineInterface): Promise<void> {
  const config = getConfig();
  config.chatHistoryEnabled = !config.chatHistoryEnabled;
  await saveConfig(config);

  if (config.chatHistoryEnabled) {
    console.log(colors.success("Chat history enabled"));
    console.log(
      colors.info(
        "Messages will be saved to: ~/.whatsapp-cli/chat-history.json",
      ),
    );
  } else {
    console.log(colors.warning("Chat history disabled"));
    console.log(colors.dim("Existing history will be preserved"));
  }

  await promptUser(rl, "Press Enter to continue...");
}
