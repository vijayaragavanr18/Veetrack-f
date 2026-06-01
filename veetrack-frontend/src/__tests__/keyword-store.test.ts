import { useKeywordStore } from '@/lib/stores/keyword-store'

describe('Keyword Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useKeywordStore.setState({
      keywords: ['Apple', 'Microsoft'],
      activeKeyword: 'Apple'
    })
  })

  it('should initialize with default keywords', () => {
    const state = useKeywordStore.getState()
    expect(state.keywords).toContain('Apple')
    expect(state.keywords).toContain('Microsoft')
  })

  it('should allow adding a new keyword', () => {
    const { addKeyword } = useKeywordStore.getState()
    addKeyword('Google')
    
    const state = useKeywordStore.getState()
    expect(state.keywords).toContain('Google')
  })

  it('should allow removing a keyword', () => {
    const { removeKeyword } = useKeywordStore.getState()
    removeKeyword('Apple')
    
    const state = useKeywordStore.getState()
    expect(state.keywords).not.toContain('Apple')
    expect(state.activeKeyword).toBeNull() // Store unsets activeKeyword if removed
  })
})
