import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import AnalyzeScreen from './src/screens/AnalyzeScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator();

const NavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: '#02080A',
    text: colors.white,
    border: colors.gold,
    primary: colors.fairwayHi,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={NavTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#02080A' },
            headerTintColor: colors.gold,
            headerTitleStyle: {
              fontWeight: '900',
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontStyle: 'italic',
              fontSize: 16,
              color: colors.white,
            },
            headerShadowVisible: true,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Swing Tour ’26' }}
          />
          <Stack.Screen
            name="Analyze"
            component={AnalyzeScreen}
            options={{ title: 'Scan In Progress' }}
          />
          <Stack.Screen
            name="Results"
            component={ResultsScreen}
            options={{ title: 'Player Report' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Tournament Setup' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
