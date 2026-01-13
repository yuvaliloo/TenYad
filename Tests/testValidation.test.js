// __tests__/taskValidation.test.js
import { validateTask } from "../services/taskService";

test("validateTask returns true for valid task", () => {
  const task = {
    title: "Fix sink",
    description: "Kitchen sink is leaking",
    budget: 200,
  };

  const result = validateTask(task);

  expect(result).toBe(true);
});
