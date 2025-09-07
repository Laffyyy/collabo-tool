/// <reference types="cypress" />

export {}
declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      login(email: string, password: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('http://localhost:5173/login')
  cy.get('input[id="loginUsername"]').type(email)
  cy.get('input[id="loginPassword"]').type(password)
  cy.get('button').contains('Sign in to your workspace').click()

  cy.task('getLatestOtp', { email }).then((otp) => {
    cy.get('#otp-input-0').type(otp[0])
    cy.get('#otp-input-1').type(otp[1]) 
    cy.get('#otp-input-2').type(otp[2])
    cy.get('#otp-input-3').type(otp[3])
    cy.get('#otp-input-4').type(otp[4])
    cy.get('#otp-input-5').type(otp[5])
  })
})