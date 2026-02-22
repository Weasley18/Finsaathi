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
                <Stack.Screen name="AdvisorCoPilotChat" component={Screens.AdvisorCoPilotChat} />
                <Stack.Screen name="DirectMessages" component={Screens.DirectMessages} />
                <Stack.Screen name="Recommendations" component={Screens.Recommendations} />
                <Stack.Screen name="Notifications" component={Screens.Notifications} />
                <Stack.Screen name="SIPCalculator" component={Screens.SIPCalculator} />
                <Stack.Screen name="WaitingRoom" component={Screens.WaitingRoom} />
                <Stack.Screen name="DiscoverMarketplace" component={Screens.DiscoverMarketplace} />
                <Stack.Screen name="SMSImport" component={Screens.SMSImport} />
                <Stack.Screen name="LessonDetail" component={Screens.LessonDetail} />
                <Stack.Screen name="PredictiveAnalysis" component={Screens.PredictiveAnalysis} />
                <Stack.Screen name="AdminDashboard" component={Screens.AdminDashboard} />
                <Stack.Screen name="AdminApprovals" component={Screens.AdminApprovals} />
                <Stack.Screen name="AdminContent" component={Screens.AdminContent} />
                <Stack.Screen name="AdminAdvisors" component={Screens.AdminAdvisors} />
                <Stack.Screen name="PartnerDashboard" component={Screens.PartnerDashboard} />
                <Stack.Screen name="PartnerProducts" component={Screens.PartnerProducts} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
