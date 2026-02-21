import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import * as Screens from '../screens';

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="SplashScreen" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="SplashScreen" component={Screens.SplashScreen} />
                <Stack.Screen name="Login" component={Screens.LoginScreen} />
                <Stack.Screen name="LanguageSelection" component={Screens.LanguageSelection} />
                <Stack.Screen name="Dashboard" component={Screens.Dashboard} />
                <Stack.Screen name="SpendingReport" component={Screens.SpendingReport} />
                <Stack.Screen name="HealthReport" component={Screens.HealthReport} />
                <Stack.Screen name="BalanceSheet" component={Screens.BalanceSheet} />
                <Stack.Screen name="MonthlySavings" component={Screens.MonthlySavings} />
                <Stack.Screen name="FinancialInsights" component={Screens.FinancialInsights} />
                <Stack.Screen name="SavingsGoals" component={Screens.SavingsGoals} />
                <Stack.Screen name="GoalAchieved" component={Screens.GoalAchieved} />
                <Stack.Screen name="ExpenseEntry" component={Screens.ExpenseEntry} />
                <Stack.Screen name="AIChat" component={Screens.AIChat} />
                <Stack.Screen name="OnboardingScreen" component={Screens.OnboardingScreen} />
                <Stack.Screen name="ProfileSettings" component={Screens.ProfileSettings} />
                <Stack.Screen name="SecuritySettings" component={Screens.SecuritySettings} />
                <Stack.Screen name="LinkFinance" component={Screens.LinkFinance} />
                <Stack.Screen name="AdvisorDashboard" component={Screens.AdvisorDashboard} />
                <Stack.Screen name="AdvisorClientDetail" component={Screens.AdvisorClientDetail} />
                <Stack.Screen name="SIPCalculator" component={Screens.SIPCalculator} />
                <Stack.Screen name="WaitingRoom" component={Screens.WaitingRoom} />
                <Stack.Screen name="DiscoverMarketplace" component={Screens.DiscoverMarketplace} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
