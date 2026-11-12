import api from '../api'
import { getMarketingAttribution } from './marketingAttribution'

export const loginUser = async ({ email, password }) => {
  const response = await api.post('/auth/login', {
    email,
    password,
  })

  return response.data
}

export const registerUser = async ({
  firstName,
  lastName,
  email,
  phone,
  password,
  referralCode,
}) => {
  const response = await api.post('/auth/register', {
    firstName,
    lastName,
    email,
    phone,
    password,
    ...(referralCode ? { referralCode } : {}),
    marketingAttribution: getMarketingAttribution(),
  })

  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

export const googleLoginUser = async ({ credential, phone, referralCode }) => {
  const response = await api.post('/auth/google', {
    credential,
    ...(phone ? { phone } : {}),
    ...(referralCode ? { referralCode } : {}),
    marketingAttribution: getMarketingAttribution(),
  })

  return response.data
}
