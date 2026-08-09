---
title: "C#中的异步"
published: 2026-07-24
description: 该文章介绍了我学习异步时自己的见解和笔记
tags: ["C#", "异步"]
category: "C#"
draft: false
pinned: true
comment: false
---

## 一、C# 中异步的定义

在 C# 中，异步编程是一种通过 `async` 和 `await` 关键字来实现的编程范式，它允许程序在不阻塞主线程的情况下执行耗时操作，从而提高程序的并发性和响应性。这种方法特别适用于 I/O 密集型操作、GUI 应用程序和服务器应用程序，因为它们经常需要处理可能导致线程阻塞的操作。

> **个人理解**：异步操作就是让程序执行耗时操作时，不会在那里干等，而是可以先去处理其他不耗时的操作，待耗时操作完成后，再回来执行输出对应结果。通俗类比一下：当我们点外卖吃饭，外卖小哥要半小时才能送到，我们不能马上执行吃饭这一行为，那这半小时我们总不能干等吧？这个时候我们可以去干别的事情，打游戏之类的，等饭到了我们再吃饭——这就是一个异步操作。

## 二、异步的语法

使用异步需要用到 `async` 和 `await` 关键字，语法格式如下：

```csharp
// 语法模板
[访问修饰符] async Task / Task<T> 方法名([参数])
{
    // ... 同步代码
    var result = await SomeAsyncOperation();
    // ... 处理结果的同步代码
}
```

这里解释声明的类型为什么是 Task 相关（不必对 Task 感到疑惑，接下来我会介绍它）：

1. 在 C# 中，`Task` 和 `Task<T>` 类常用于表示异步操作的结果，其中 `Task` 表示一个没有返回值的异步操作，而 `Task<T>` 表示有返回值的异步操作
2. 至于为什么使用 Task，是因为 Task 就像是一个代表异步操作的凭证，使用异步必须使用 Task，这是一种标准，否则无法使用异步操作（WPF 中的事件处理相关存在 `async void`，不必疑惑，也只有这里存在了）

## 三、异步的原理

本人暂时只会使用，并不是很理解底层相关，这里给一段 DeepSeek 的解释：

> 纯 C# 异步的本质并非依赖"多开线程去死等"，而是"回调 + 状态机 + 操作系统硬件协同"。当你执行到 `await` 时，当前线程并不阻塞，而是立刻交出执行权，将真正的耗时操作（如网络请求）直接交给操作系统底层去处理，线程自身得以空闲去执行别的代码。当操作系统底层干完活后，会触发通知，.NET 线程池会抓一个空闲线程去执行 `await` 后面的残留代码。为了提升纯后端高并发性能，通常我们会加上 `.ConfigureAwait(false)`，省去不必要的上下文切换开销。

## 四、异步的使用

这里是一个使用了异步的简单代码演示，结合了异常捕获操作：

```csharp
using System;
using System.Threading.Tasks;

namespace AsyncNoteDemo
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("主程序：开始执行");

            try
            {
                string result = await GetUserDataFromDbAsync();
                Console.WriteLine($"获取成功：{result}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"捕获到异常！错误信息：{ex.Message}");
            }

            Console.WriteLine("主程序：安全结束，没有崩溃");
            Console.ReadKey();
        }

        static async Task<string> GetUserDataFromDbAsync()
        {
            await Task.Delay(1000);

            throw new InvalidOperationException("模拟错误：数据库连接超时！");

            return "Ray的数据";
        }
    }
}
```

**代码解释**：主函数中我们尝试执行自定义的异步方法 `GetUserDataFromDbAsync()`，该方法模拟了耗时操作，1s 后弹出异常，模拟连接失败的报错。该异常并没有导致程序崩溃，而是返回 Task 对象给到 try-catch 代码块；catch 执行，提示用户捕获到异常，同时程序也安全地执行完毕。

## 五、Task 相关

Task 本质是一个"类"，可以不结合 async/await 使用。我目前知道以下一个用途：声明一个 Task 对象，存储"容器的状态"。举个例子，我们把线程 Sleep 这个状态存储起来，等待要使用的时候再拿出来执行：

```csharp
Task longRunningTask = new Task(() => Thread.Sleep(1000));
// 可以把这个 task 存起来，等某个条件触发再 .Start()
```

Task 也有许多自带的方法，例如类似线程的启动和等待：`Task.Run` / `Task.Wait`。在这里就不再赘述 Task 相关知识了，后续我会单独写一篇 Task 的相关文章。

## 六、总结

异步是现代 .NET 中不可或缺的一部分，通过异步操作可以实现线程资源的动态调度，实现非阻塞编程。

## 七、随笔

本人对异步的理解还很浅显，在后续的学习中会逐步加强对其的理解。该篇文章是我发布的第一篇知识相关博客，各个方面都还不是很成熟。如有错误，还请指出，感谢各位的观看！

ps:头一次写md文档，格式写的错错的，还是让agent帮我修改优化了格式，还得学啊）
