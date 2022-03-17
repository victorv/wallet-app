import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAsync } from 'react-async-hook'
import * as SecureStore from 'expo-secure-store'
import { NetType } from '@helium/crypto-react-native'
import { accountNetType, AccountNetTypeOpt } from '../utils/accountUtils'
import {
  createSecureAccount,
  deleteSecureAccount,
  SecureAccount,
  signoutSecureStore,
  storeSecureAccount,
} from './secureStorage'
import {
  CSAccount,
  CSAccounts,
  getCloudDefaultAccountAddress,
  restoreAccounts,
  setCloudDefaultAccountAddress,
  signoutCloudStorage,
  sortAccounts,
  updateCloudAccounts,
  updateCloudContacts,
} from './cloudStorage'
import { removeAccountTag, tagAccount } from './oneSignalStorage'
import * as Logger from '../utils/logger'

const useAccountStorageHook = () => {
  const [currentAccount, setCurrentAccount] = useState<
    CSAccount | null | undefined
  >(undefined)
  const [accounts, setAccounts] = useState<CSAccounts>()
  const [contacts, setContacts] = useState<CSAccount[]>([])
  const [defaultAccountAddress, setDefaultAccountAddress] = useState<string>()

  const { result: restoredAccounts } = useAsync(restoreAccounts, [])

  useEffect(() => {
    if (!restoredAccounts) return

    setAccounts(restoredAccounts.csAccounts)
    setCurrentAccount(restoredAccounts.current)
    setContacts(restoredAccounts.contacts)
  }, [restoredAccounts])

  useAsync(async () => {
    if (!accounts || Object.values(accounts)?.length === 0) return

    const restoredAddress = await getCloudDefaultAccountAddress()
    if (!restoredAddress) {
      // set default account to first in list
      const firstAccount = Object.values(accounts)[0]
      const firstAddress = firstAccount.address
      await setCloudDefaultAccountAddress(firstAddress)
      setDefaultAccountAddress(firstAddress)
      Logger.setUser(firstAddress)
    } else {
      // restore default account
      setDefaultAccountAddress(restoredAddress)
      Logger.setUser(restoredAddress)
    }
  }, [accounts])

  const restored = useMemo(() => accounts !== undefined, [accounts])

  const accountAddresses = useMemo(
    () => Object.keys(accounts || {}),
    [accounts],
  )

  const hasAccounts = useMemo(
    () => !!accountAddresses.length,
    [accountAddresses.length],
  )

  const sortedAccounts = useMemo(
    () => sortAccounts(accounts || {}, defaultAccountAddress),
    [accounts, defaultAccountAddress],
  )

  const sortedTestnetAccounts = useMemo(
    () => sortedAccounts.filter(({ netType }) => netType === NetType.TESTNET),
    [sortedAccounts],
  )

  const sortedMainnetAccounts = useMemo(
    () => sortedAccounts.filter(({ netType }) => netType === NetType.MAINNET),
    [sortedAccounts],
  )

  const sortedAccountsForNetType = useCallback(
    (netType: AccountNetTypeOpt) => {
      if (netType === NetType.MAINNET) {
        return sortedMainnetAccounts
      }
      if (netType === NetType.TESTNET) {
        return sortedTestnetAccounts
      }
      return sortedAccounts
    },
    [sortedAccounts, sortedMainnetAccounts, sortedTestnetAccounts],
  )

  const testnetContacts = useMemo(
    () => contacts.filter(({ netType }) => netType === NetType.TESTNET),
    [contacts],
  )

  const mainnetContacts = useMemo(
    () => contacts.filter(({ netType }) => netType === NetType.MAINNET),
    [contacts],
  )

  const contactsForNetType = useCallback(
    (netType: AccountNetTypeOpt) => {
      if (netType === NetType.MAINNET) return mainnetContacts
      if (netType === NetType.TESTNET) return testnetContacts
      return contacts
    },
    [contacts, mainnetContacts, testnetContacts],
  )

  const upsertAccount = useCallback(
    async ({
      alias,
      address,
      secureAccount,
    }: {
      alias: string
      address: string
      secureAccount?: SecureAccount
    }) => {
      const nextAccount: CSAccount = {
        alias,
        address,
        netType: accountNetType(address),
      }

      const nextAccounts: CSAccounts = {
        ...accounts,
        [address]: nextAccount,
      }
      setAccounts(nextAccounts)
      setCurrentAccount(nextAccount)
      await updateCloudAccounts(nextAccounts)

      await tagAccount(address)
      if (secureAccount) {
        return storeSecureAccount(secureAccount)
      }
    },
    [accounts],
  )

  const addContact = useCallback(
    async (account: CSAccount) => {
      const filtered = contacts.filter((c) => c.address !== account.address)
      const nextContacts = [...filtered, account]
      setContacts(nextContacts)

      return updateCloudContacts(nextContacts)
    },
    [contacts],
  )

  const editContact = useCallback(
    async (oldAddress: string, updatedAccount: CSAccount) => {
      const filtered = contacts.filter((c) => c.address !== oldAddress)
      const nextContacts = [...filtered, updatedAccount]
      setContacts(nextContacts)

      return updateCloudContacts(nextContacts)
    },
    [contacts],
  )

  const deleteContact = useCallback(
    async (address: string) => {
      const filtered = contacts.filter((c) => c.address !== address)
      const nextContacts = [...filtered]
      setContacts(nextContacts)
      return updateCloudContacts(nextContacts)
    },
    [contacts],
  )

  const updateDefaultAccountAddress = useCallback(
    async (address: string | undefined) => {
      await setCloudDefaultAccountAddress(address)
      setDefaultAccountAddress(address)
      Logger.setUser(address)
    },
    [],
  )

  const signOut = useCallback(
    async (account?: CSAccount | null) => {
      if (account?.address) {
        // sign out of specific account
        await removeAccountTag(account.address)
        await deleteSecureAccount(account)
        let newAccounts: CSAccounts = {}
        if (accounts && accounts[account.address]) {
          newAccounts = { ...accounts }
          delete newAccounts[account.address]
        }
        const newAccountValues = Object.values(newAccounts)
        const newCurrentAccount = newAccountValues?.length
          ? newAccountValues[0]
          : undefined
        await updateCloudAccounts(newAccounts)
        setAccounts(newAccounts)
        setCurrentAccount(newCurrentAccount)
        if (account?.address === defaultAccountAddress) {
          await updateDefaultAccountAddress(newCurrentAccount?.address)
        }
      } else {
        // sign out of all accounts
        await Promise.all([
          ...Object.keys(accounts || {}).map((key) => {
            return SecureStore.deleteItemAsync(key)
          }),
          ...Object.keys(accounts || {}).map((key) => {
            return removeAccountTag(key)
          }),
          ...signoutSecureStore(
            sortedAccounts.map(({ address: addr }) => addr),
          ),
          signoutCloudStorage(),
          updateDefaultAccountAddress(undefined),
        ])
        setAccounts({})
        setContacts([])
        setCurrentAccount(undefined)
      }
    },
    [
      accounts,
      defaultAccountAddress,
      sortedAccounts,
      updateDefaultAccountAddress,
    ],
  )

  return {
    accounts,
    accountAddresses,
    addContact,
    editContact,
    deleteContact,
    defaultAccountAddress,
    updateDefaultAccountAddress,
    contacts,
    contactsForNetType,
    createSecureAccount,
    currentAccount,
    hasAccounts,
    mainnetContacts,
    restored,
    setCurrentAccount,
    signOut,
    sortedAccounts,
    sortedAccountsForNetType,
    sortedMainnetAccounts,
    sortedTestnetAccounts,
    testnetContacts,
    upsertAccount,
  }
}

const initialState = {
  accounts: {},
  accountAddresses: [],
  addContact: async () => undefined,
  editContact: async () => undefined,
  deleteContact: async () => undefined,
  defaultAccountAddress: undefined,
  updateDefaultAccountAddress: async () => undefined,
  contacts: [],
  contactsForNetType: () => [],
  createSecureAccount: async () => ({
    mnemonic: [],
    keypair: { pk: '', sk: '' },
    address: '',
  }),
  currentAccount: undefined,
  hasAccounts: false,
  mainnetContacts: [],
  restored: false,
  setCurrentAccount: () => undefined,
  signOut: async () => undefined,
  sortedAccounts: [],
  sortedAccountsForNetType: () => [],
  sortedMainnetAccounts: [],
  sortedTestnetAccounts: [],
  testnetContacts: [],
  upsertAccount: async () => undefined,
}

const AccountStorageContext =
  createContext<ReturnType<typeof useAccountStorageHook>>(initialState)
const { Provider } = AccountStorageContext

const AccountStorageProvider = ({ children }: { children: ReactNode }) => {
  return <Provider value={useAccountStorageHook()}>{children}</Provider>
}

export const useAccountStorage = () => useContext(AccountStorageContext)

export default AccountStorageProvider
