// __tests__/publishTask.test.js
import { publishTask } from "../services/taskService";
import { addDoc } from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
}));

test("publishTask calls Firestore addDoc with correct data", async () => {
  const task = {
    title: "Fix sink",
    description: "Kitchen sink is leaking",
    budget: 200,
  };

  addDoc.mockResolvedValue({ id: "123" });

  const result = await publishTask(task);

  expect(addDoc).toHaveBeenCalledTimes(1);
  expect(addDoc).toHaveBeenCalledWith(expect.anything(), task);
  expect(result.id).toBe("123");
});
