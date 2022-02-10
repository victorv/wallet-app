import React, { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Box from './Box'
import Text from './Text'
import TextInput from './TextInput'

export const MEMO_MAX_BYTES = 8
export const encodeMemoString = (utf8Input: string | undefined) => {
  if (!utf8Input) return undefined
  const buff = Buffer.from(utf8Input, 'utf8')
  return buff.toString('base64')
}

export const decodeMemoString = (base64String: string | undefined | null) => {
  if (!base64String) return ''
  const buff = Buffer.from(base64String, 'base64')
  return buff.toString('utf8')
}

export const getMemoBytesLeft = (base64Memo?: string) => {
  if (!base64Memo)
    return { numBytes: MEMO_MAX_BYTES, valid: true, bytesUsed: 0 }
  const buff = Buffer.from(base64Memo, 'base64')
  const size = buff.byteLength
  return {
    bytesRemaining: MEMO_MAX_BYTES - size,
    valid: size <= MEMO_MAX_BYTES,
    bytesUsed: size,
  }
}

export const useMemoValid = (txnMemo?: string) => {
  return useMemo(() => {
    const base64Memo = encodeMemoString(txnMemo)
    return getMemoBytesLeft(base64Memo)
  }, [txnMemo])
}

type Props = {
  onChangeText?: ((text: string) => void) | undefined
  value?: string | undefined
}
const MemoInput = ({ onChangeText, value }: Props) => {
  const { t } = useTranslation()
  const { bytesUsed, valid } = useMemoValid(value)

  return (
    <Box
      flex={1}
      justifyContent="center"
      flexDirection="row"
      alignItems="center"
    >
      <TextInput
        flex={1}
        variant="transparent"
        placeholder={t('payment.enterMemo')}
        onChangeText={onChangeText}
        value={value}
        returnKeyType="next"
      />
      <Text
        variant="body3"
        color={valid ? 'secondaryText' : 'error'}
        marginRight="m"
      >
        {t('payment.memoBytes', {
          used: bytesUsed,
          total: MEMO_MAX_BYTES,
        })}
      </Text>
    </Box>
  )
}
export default memo(MemoInput)