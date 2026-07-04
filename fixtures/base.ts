import { test as baseTest, expect } from '@playwright/test';
import { attachNetworkCapture } from 'postman-playwright';

const test = process.env.POSTMAN_CAPTURE === '1' ? attachNetworkCapture(baseTest) : baseTest;

export { test, expect };
