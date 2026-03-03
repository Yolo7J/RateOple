let mockUsers = [
  {
    email: "test@rateople.com",
    username: "TestUser",
    password: "Password123!"
  }
];

// Simulate delay
const simulateDelay = (ms = 500) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const authMockService = {
  async login(email, password) {
    await simulateDelay();

    const user = mockUsers.find(
      u => u.email === email && u.password === password
    );

    if (!user) {
      throw new Error("Invalid credentials");
    }

    return { email: user.email, username: user.username };
  },

  async register({ email, username, password }) {
    await simulateDelay();

    const exists = mockUsers.find(u => u.email === email);

    if (exists) {
      throw new Error("Email already exists");
    }

    const newUser = { email, username, password };
    mockUsers.push(newUser);

    return { email, username };
  }
};
