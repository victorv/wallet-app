import React, { memo } from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import AccountAssignScreen from '../onboarding/AccountAssignScreen'
import AccountsScreen from '../account/AccountsScreen'
import PaymentScreen from '../payment/PaymentScreen'
import WifiOnboard from '../payment/WifiOnboard'

const HomeStack = createStackNavigator()

const HomeStackScreen = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{ presentation: 'modal', headerShown: false }}
    >
      <HomeStack.Screen
        name="AccountsScreen"
        options={{ headerShown: false }}
        component={AccountsScreen}
      />
      <HomeStack.Screen
        name="AccountAssignScreen"
        component={AccountAssignScreen}
      />
      <HomeStack.Screen name="PaymentScreen" component={PaymentScreen} />
      <HomeStack.Screen name="WifiOnboard" component={WifiOnboard} />
    </HomeStack.Navigator>
  )
}

export default memo(HomeStackScreen)