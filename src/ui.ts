import chalk from "chalk";

export const colors = {
  // Status indicators
  success: (text: string) => chalk.green(`✅ ${text}`),
  error: (text: string) => chalk.red(`❌ ${text}`),
  warning: (text: string) => chalk.yellow(`⚠️  ${text}`),
  info: (text: string) => chalk.blue(`ℹ️  ${text}`),
  loading: (text: string) => chalk.cyan(`⏳ ${text}`),

  // Formatting
  title: (text: string) => chalk.bold.cyan(text),
  subtitle: (text: string) => chalk.cyan(text),
  highlight: (text: string) => chalk.bold.yellow(text),
  dim: (text: string) => chalk.dim(text),
  bold: (text: string) => chalk.bold(text),

  // AI specific
  ai: (text: string) => chalk.magenta(`🤖 ${text}`),
  provider: (text: string) => chalk.blue(text),
  model: (text: string) => chalk.magenta(text),

  // Chat specific
  incoming: (text: string) => chalk.green(`📥 ${text}`),
  outgoing: (text: string) => chalk.blue(`📤 ${text}`),
  timestamp: (text: string) => chalk.dim(text),

  // Menu
  option: (num: string, text: string) => chalk.cyan(`  ${num}. `) + text,
  active: (text: string) => chalk.inverse(chalk.green(text)),
};

export function printHeader(title: string): void {
  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(chalk.bold.cyan(`             ${title}`));
  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
}

export function printSection(title: string): void {
  console.log(chalk.bold.yellow(`\n${title}:`));
  console.log(chalk.yellow("─".repeat(title.length + 1)));
}

export function printMenu(options: Array<{ num: string; text: string }>): void {
  console.log(chalk.bold("\n📱 Available Commands:"));
  options.forEach(opt => {
    console.log(colors.option(opt.num, opt.text));
  });
  console.log("");
}

export function printTable(
  rows: Array<{ label: string; value: string }>,
): void {
  const maxLabelLength = Math.max(...rows.map(r => r.label.length));

  rows.forEach(row => {
    const padding = " ".repeat(maxLabelLength - row.label.length);
    console.log(
      `  ${chalk.cyan(row.label)}${padding}: ${chalk.bold(row.value)}`,
    );
  });
}

export function printSeparator(): void {
  console.log(chalk.dim("─".repeat(50)));
}

export function clearScreen(): void {
  console.clear();
}

export function printSuccess(message: string): void {
  console.log(colors.success(message));
}

export function printError(message: string): void {
  console.log(colors.error(message));
}

export function printWarning(message: string): void {
  console.log(colors.warning(message));
}

export function printInfo(message: string): void {
  console.log(colors.info(message));
}

export function printLoading(message: string): void {
  console.log(colors.loading(message));
}
