type ClaimReward = {
  retcode: number
  message: string
  data: {
    code: string
  } | null
}

export default ClaimReward
