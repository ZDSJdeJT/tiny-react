import React from "@/core/react";
import { uuidv7 } from "uuidv7";

import { cn } from "@/lib/utils";
import packageJSON from "~/package.json";

const App = () => {
  const [input, setInput] = React.useState("");
  const [todoList, setTodoList] = React.useState([]);
  const [state, setState] = React.useState("All");

  const onAdd = (title) => {
    if (!title) {
      alert("Please enter title.");
      return;
    }
    setTodoList([
      ...todoList,
      {
        id: uuidv7(),
        title,
        isDone: false,
      },
    ]);
    setInput("");
  };

  const onRemove = ({ id }) => {
    setTodoList(todoList.filter((todo) => todo.id !== id));
  };

  const onToggle = ({ id }) => {
    setTodoList(
      todoList.map((todo) => ({
        ...todo,
        isDone: id === todo.id ? !todo.isDone : todo.isDone,
      })),
    );
  };

  return (
    <div>
      <header>
        <h1>Todo List</h1>
      </header>
      <main>
        <div>
          <input
            type="text"
            placeholder="Please enter title..."
            className="input"
            value={input}
            onInput={(e) => {
              setInput(e.target.value);
            }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => {
              onAdd(input);
            }}
          >
            Add
          </button>
        </div>
        <select
          defaultValue="Select status"
          className="select"
          onChange={(e) => {
            setState(e.target.value);
          }}
        >
          <option disabled={true}>Select status</option>
          <option>All</option>
          <option>Todo</option>
          <option>Done</option>
        </select>
        <ul className="list bg-base-100 rounded-box shadow-md">
          {...todoList
            .filter((todo) => {
              if (state === "All") {
                return true;
              }
              if (state === "Todo") {
                return !todo.isDone;
              }
              return todo.isDone;
            })
            .map((todo, index) => (
              <li key={todo.id} className="list-row">
                <div className="text-4xl font-thin opacity-30 tabular-nums">
                  {index + 1}
                </div>
                <div className="list-col-grow">
                  <div className={cn(todo.isDone && "line-through")}>
                    {todo.title}
                  </div>
                  <div className="text-xs font-semibold opacity-60">
                    {todo.id}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-square btn-ghost"
                  onClick={() => {
                    onRemove(todo);
                  }}
                >
                  🗑️
                </button>
                <button
                  type="button"
                  className="btn btn-square btn-ghost"
                  onClick={() => {
                    onToggle(todo);
                  }}
                >
                  {todo.isDone ? "❎" : "☑️"}
                </button>
              </li>
            ))}
        </ul>
      </main>
      <footer>Built by {packageJSON.author}.</footer>
    </div>
  );
};

export default App;
