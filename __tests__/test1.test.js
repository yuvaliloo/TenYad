// PublishTask.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublishTask from "./PublishTask";
import { publishTask } from "../api/tasks";
import { MemoryRouter } from "react-router-dom";

// Mock ל-API
jest.mock("../api/tasks", () => ({
  publishTask: jest.fn(),
}));

// Mock לניווט
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

test("Successful task publication with valid details", async () => {
  // 1. Setup – תנאים התחלתיים
  publishTask.mockResolvedValueOnce({ success: true });

  render(
    <MemoryRouter>
      <PublishTask />
    </MemoryRouter>
  );

  const publishButton = screen.getByText("Publish Task");

  // 2. Act – קריאה לפונקציה הנבדקת
  fireEvent.click(publishButton);

  // 3. Assert – בדיקת תוצאה צפויה
  await waitFor(() => {
    expect(publishTask).toHaveBeenCalledTimes(1);
  });

  expect(mockNavigate).toHaveBeenCalledWith("/tasks");
});
