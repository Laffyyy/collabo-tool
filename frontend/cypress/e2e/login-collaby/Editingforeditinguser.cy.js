describe('should be able to editing user', () => {
    it('should be able to edit user', () => {
        cy.login('test@example.com', '12345')
        cy.get('button').contains('Add User').click()

        

    })
})