describe('should be able to login', () => {

  it('should be able to create a new broadcast', () => {
    cy.login('test@example.com', '12345')
    
    cy.get('.hidden > :nth-child(2)').click()
    cy.get('.fade-in > .primary-button').click()

    const randomString = Math.random().toString(36).substring(2, 15);
    cy.get('#title').type(`Test Broadcast ${randomString}`)
    cy.get('#content').type('Test Message')
    cy.get('#priority').select('low')

    cy.get('#ou-selector').click()
    cy.get('.absolute > :nth-child(1) > .flex > span').click()
    cy.get('#ou-selector').click()

    cy.get('.grid > :nth-child(3)').click()
    cy.get('.grid > :nth-child(1)').click()

    cy.get('#acknowledgmentType').select('none')

    cy.get('.space-y-3 > :nth-child(1) > .mt-1').click()

    cy.get('#endDate').type('2025-01-01')
  })
  
 
  

})