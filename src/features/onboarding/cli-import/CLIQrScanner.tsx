import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import useHaptic from '../../../utils/useHaptic'
import useAlert from '../../../utils/useAlert'
import {
  CLIAccountNavigationProp,
  EncyptedAccountRouteParam,
} from './CLIAccountNavigatorTypes'
import QrScanner from '../../../components/QrScanner'

const CLIQrScanner = () => {
  const { triggerNotification } = useHaptic()
  const { showOKAlert } = useAlert()
  const { t } = useTranslation()
  const navigation = useNavigation<CLIAccountNavigationProp>()

  const handleBarCodeScanned = useCallback(
    async (data: string) => {
      const query = JSON.parse(data) as EncyptedAccountRouteParam
      if (query) {
        triggerNotification('success')
        navigation.navigate('CLIPasswordScreen', query)
      } else {
        await showOKAlert({
          title: t('payment.qrScanFail.title'),
          message: t('payment.qrScanFail.message'),
        })
        triggerNotification('error')
        navigation.goBack()
      }
    },
    [navigation, showOKAlert, t, triggerNotification],
  )

  return <QrScanner onBarCodeScanned={handleBarCodeScanned} />
}
export default CLIQrScanner
