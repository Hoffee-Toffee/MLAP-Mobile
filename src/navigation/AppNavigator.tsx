import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import NowPlaying from '../screens/NowPlaying';
import QueueScreen from '../screens/QueueScreen';


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="NowPlaying" component={NowPlaying} />
        <Stack.Screen name="Queue" component={QueueScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
