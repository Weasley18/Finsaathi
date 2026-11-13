const fs = require('fs');
const path = require('path');

const screens = [
  'SplashScreen',
  'LanguageSelection',
  'SignIn',
  'BankSelection',
  'BankAuth',
  'BankLinkSuccess',
  'Dashboard',
  'SpendingReport',
  'HealthReport',
  'BalanceSheet',
  'MonthlySavings',
  'FinancialInsights',
  'SavingsGoals',
  'GoalAchieved',
  'ExpenseEntry',
  'AIChat',
  'AIProfiling',
  'ProfileSettings',
  'SecuritySettings'
];

const screensDir = path.join(__dirname, 'app', 'screens');

if (!fs.existsSync(screensDir)) {
  fs.mkdirSync(screensDir, { recursive: true });
}

screens.forEach(screen => {
  const content = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ${screen}() {
  return (
    <View style={styles.container}>
      <Text>${screen}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
`;
  fs.writeFileSync(path.join(screensDir, `${screen}.js`), content);
});

const indexContent = screens.map(s => `export { default as ${s} } from './${s}';`).join('\n');
fs.writeFileSync(path.join(screensDir, 'index.js'), indexContent);

console.log('Screens generated successfully.');
