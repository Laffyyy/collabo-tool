describe('should be able to do usermanagement things', () => {

  it('should be able to create a new user(Manager)', () => {
    cy.login('test@example.com', '12345')

    cy.get('button').contains('Add User').click()

    const EmployeeID = "EMP" + Math.floor(Math.random() * 10000);
    cy.get('#employeeId').type(EmployeeID)
    const Name = "User" + Math.random().toString(36).substring(2, 7);
    cy.get('#name').type(Name)
    const Email = "user" + Math.random().toString(36).substring(2, 7) + "@example.com";
    cy.get('#email').type(Email)

    cy.get('#role').select('Manager')

    // Select a random option from the OU dropdown (excluding the first/empty option)
    cy.get('#ou').find('option').then(options => {
        const count = options.length;
        // Skip the first option if it's a placeholder
        const randomIndex = count > 1 ? Math.floor(Math.random() * (count - 1)) + 1 : 0;
        const randomValue = options[randomIndex].value;
        cy.get('#ou').select(randomValue);
    });

    cy.get('.justify-end > .px-6').click()
    cy.get('.h-full').contains(Email).should('exist');


  })

  it('should be able to create a new user(Supervisor)', () => {
    cy.login('test@example.com', '12345')

    cy.get('button').contains('Add User').click()

    const EmployeeID = "EMP" + Math.floor(Math.random() * 10000);
    cy.get('#employeeId').type(EmployeeID)
    const Name = "User" + Math.random().toString(36).substring(2, 7);
    cy.get('#name').type(Name)
    const Email = "user" + Math.random().toString(36).substring(2, 7) + "@example.com";
    cy.get('#email').type(Email)

    cy.get('#role').select('Supervisor')

    cy.get('#manager').find('option').then(options => {
        const count = options.length;
        // Skip the first option if it's a placeholder
        const randomIndex = count > 1 ? Math.floor(Math.random() * (count - 1)) + 1 : 0;
        const randomValue = options[randomIndex].value;
        cy.get('#manager').select(randomValue);
    });

    // Select a random option from the OU dropdown (excluding the first/empty option)
    cy.get('#ou').find('option').then(options => {
        const count = options.length;
        // Skip the first option if it's a placeholder
        const randomIndex = count > 1 ? Math.floor(Math.random() * (count - 1)) + 1 : 0;
        const randomValue = options[randomIndex].value;
        cy.get('#ou').select(randomValue);
    });

    cy.get('.justify-end > .px-6').click()

    cy.get('.h-full').contains(Email).should('exist');  

  })

})