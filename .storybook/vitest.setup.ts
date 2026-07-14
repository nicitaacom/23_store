import { setProjectAnnotations } from "@storybook/nextjs-vite";
import { beforeAll } from "vitest";

import * as previewAnnotations from "./preview";

const projectAnnotations = setProjectAnnotations([previewAnnotations]);

beforeAll(projectAnnotations.beforeAll);
