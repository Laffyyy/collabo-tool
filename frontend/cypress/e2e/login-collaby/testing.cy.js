describe('should be able to login', () => {
  it('passes', () => {
    cy.visit('https://example.cypress.io')
  })

  it('login', () => {
    cy.visit('http://localhost:5173/login')
    cy.get('input[id="loginUsername"]').type('test@example.com')
    cy.get('input[id="loginPassword"]').type('12345')
    cy.get('button').contains('Sign in to your workspace').click()
  })

  it('should see otp page', () => {

    cy.task('getLatestOtp', { email: 'test@example.com' }).then((otp) => {
      cy.get('input[id="otp"]').type(otp)
    })
    cy.get('button').contains('Verify').click()
  })

})