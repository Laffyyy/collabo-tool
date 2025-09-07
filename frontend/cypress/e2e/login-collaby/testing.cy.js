describe('should be able to login', () => {

  it('login', () => {
    cy.visit('http://localhost:5173/login')
    cy.get('input[id="loginUsername"]').type('test@example.com')
    cy.get('input[id="loginPassword"]').type('12345')
    cy.get('button').contains('Sign in to your workspace').click()

    cy.task('getLatestOtp', { email: 'test@example.com' }).then((otp) => {
      cy.get('#otp-input-0').type(otp[0])
      cy.get('#otp-input-1').type(otp[1]) 
      cy.get('#otp-input-2').type(otp[2])
      cy.get('#otp-input-3').type(otp[3])
      cy.get('#otp-input-4').type(otp[4])
      cy.get('#otp-input-5').type(otp[5])
    })
    
  })

  

})